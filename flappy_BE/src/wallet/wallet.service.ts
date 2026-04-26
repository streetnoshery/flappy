import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoinTransaction,
  CoinTransactionDocument,
} from '../rewards/schemas/coin-transaction.schema';
import {
  ConversionRecord,
  ConversionRecordDocument,
} from './schemas/conversion-record.schema';
import { User } from '../users/schemas/user.schema';

export interface PaginatedTransactions {
  transactions: CoinTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ConversionResult {
  success: boolean;
  error?: string;
  conversionRecord?: ConversionRecord;
}

export interface ThresholdInfo {
  coinThreshold: number;
  engagementThreshold: number;
  conversionRate: number;
}

/** Minimum coin balance required to request a conversion */
export const COIN_THRESHOLD = 1000;
/** Minimum distinct subscribers who engaged with user's posts */
export const ENGAGEMENT_THRESHOLD = 50;
/** Number of coins per dollar in conversion */
export const CONVERSION_RATE = 100;

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(CoinTransaction.name)
    private coinTransactionModel: Model<CoinTransactionDocument>,
    @InjectModel(ConversionRecord.name)
    private conversionRecordModel: Model<ConversionRecordDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  /**
   * Get the current coin balance for a user.
   */
  async getBalance(userId: string): Promise<number> {
    console.log('💰 [WALLET_SERVICE] Getting balance', { userId });

    const user = await this.userModel.findOne({ userId });
    if (!user) {
      console.log('❌ [WALLET_SERVICE] User not found', { userId });
      throw new NotFoundException('User not found');
    }

    const balance = user.coinBalance ?? 0;
    console.log('✅ [WALLET_SERVICE] Balance retrieved', { userId, balance });

    return balance;
  }

  /**
   * Get paginated transaction history for a user, sorted by createdAt descending.
   */
  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedTransactions> {
    console.log('📜 [WALLET_SERVICE] Getting transactions', {
      userId,
      page,
      limit,
    });

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.coinTransactionModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.coinTransactionModel.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    console.log('✅ [WALLET_SERVICE] Transactions retrieved', {
      userId,
      count: transactions.length,
      total,
      page,
      totalPages,
    });

    return {
      transactions,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Request a coin-to-money conversion.
   *
   * Checks:
   * 1. Coin balance >= amount >= COIN_THRESHOLD
   * 2. Distinct subscribers who engaged with user's posts >= ENGAGEMENT_THRESHOLD
   * 3. No pending conversion already exists
   *
   * On approval:
   * - Atomically deduct coins from user balance
   * - Create a ConversionRecord with status 'pending'
   * - Record a debit CoinTransaction with eventType 'conversion'
   */
  async requestConversion(
    userId: string,
    amount: number,
  ): Promise<ConversionResult> {
    console.log('🔄 [WALLET_SERVICE] Processing conversion request', {
      userId,
      amount,
    });

    // 1. Verify coin balance meets threshold and requested amount
    const user = await this.userModel.findOne({ userId });
    if (!user) {
      console.log('❌ [WALLET_SERVICE] User not found', { userId });
      throw new NotFoundException('User not found');
    }

    const balance = user.coinBalance ?? 0;

    if (amount < COIN_THRESHOLD) {
      console.log('❌ [WALLET_SERVICE] Amount below coin threshold', {
        userId,
        amount,
        coinThreshold: COIN_THRESHOLD,
      });
      throw new BadRequestException(
        `Insufficient coin balance. Minimum required: ${COIN_THRESHOLD}`,
      );
    }

    if (balance < amount) {
      console.log('❌ [WALLET_SERVICE] Insufficient balance', {
        userId,
        balance,
        amount,
      });
      throw new BadRequestException(
        `Insufficient coin balance. Minimum required: ${COIN_THRESHOLD}`,
      );
    }

    // 2. Verify engagement threshold — count distinct subscribers who engaged with user's posts
    const distinctEngagers = await this.coinTransactionModel.distinct(
      'relatedUserId',
      {
        userId,
        eventType: 'engagement_received',
      },
    );

    const distinctEngagerCount = distinctEngagers.length;

    if (distinctEngagerCount < ENGAGEMENT_THRESHOLD) {
      console.log('❌ [WALLET_SERVICE] Engagement threshold not met', {
        userId,
        distinctEngagerCount,
        engagementThreshold: ENGAGEMENT_THRESHOLD,
      });
      throw new BadRequestException(
        `Engagement threshold not met. Minimum required: ${ENGAGEMENT_THRESHOLD} distinct engagements`,
      );
    }

    // 3. Check for pending conversion
    const pendingConversion = await this.conversionRecordModel.findOne({
      userId,
      status: 'pending',
    });

    if (pendingConversion) {
      console.log('❌ [WALLET_SERVICE] Pending conversion already exists', {
        userId,
        pendingConversionId: pendingConversion._id,
      });
      throw new ConflictException(
        'A conversion request is already pending. Please wait for it to be processed.',
      );
    }

    // 4. Atomically deduct coins from user balance
    const updatedUser = await this.userModel.findOneAndUpdate(
      { userId, coinBalance: { $gte: amount } },
      { $inc: { coinBalance: -amount } },
      { new: true },
    );

    if (!updatedUser) {
      console.log(
        '❌ [WALLET_SERVICE] Atomic deduction failed (balance changed)',
        { userId, amount },
      );
      throw new BadRequestException(
        `Insufficient coin balance. Minimum required: ${COIN_THRESHOLD}`,
      );
    }

    // 5. Create ConversionRecord
    const payoutAmount = amount / CONVERSION_RATE;

    const conversionRecord = await this.conversionRecordModel.create({
      userId,
      coinsConverted: amount,
      conversionRate: CONVERSION_RATE,
      payoutAmount,
      status: 'pending',
    });

    console.log('📝 [WALLET_SERVICE] Conversion record created', {
      userId,
      conversionRecordId: conversionRecord._id,
      coinsConverted: amount,
      payoutAmount,
    });

    // 6. Record debit CoinTransaction
    await this.coinTransactionModel.create({
      userId,
      amount: -amount,
      eventType: 'conversion',
      relatedPostId: undefined,
      relatedUserId: undefined,
      description: `Converted ${amount} coins to $${payoutAmount.toFixed(2)}`,
    });

    console.log('✅ [WALLET_SERVICE] Conversion request processed', {
      userId,
      coinsConverted: amount,
      payoutAmount,
      newBalance: updatedUser.coinBalance,
    });

    return {
      success: true,
      conversionRecord,
    };
  }

  /**
   * Get the current threshold values for conversion eligibility.
   */
  getThresholds(): ThresholdInfo {
    return {
      coinThreshold: COIN_THRESHOLD,
      engagementThreshold: ENGAGEMENT_THRESHOLD,
      conversionRate: CONVERSION_RATE,
    };
  }
}
