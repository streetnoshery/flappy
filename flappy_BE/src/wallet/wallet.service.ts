import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PostCoinLedger,
  PostCoinLedgerDocument,
} from '../rewards/schemas/post-coin-ledger.schema';
import {
  CoinTransaction,
  CoinTransactionDocument,
} from '../rewards/schemas/coin-transaction.schema';

export interface WalletSummary {
  withdrawableBalance: number;
  pendingBalance: number;
  thresholdReachedPostCount: number;
  totalPostCount: number;
}

export interface PostEarning {
  postId: string;
  coinBalance: number;
  thresholdReached: boolean;
  thresholdReachedAt?: Date;
  converted: boolean;
}

export interface PaginatedPostEarnings {
  items: PostEarning[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConversionResult {
  success: boolean;
  convertedAmount?: number;
  postId?: string;
  transactionId?: string;
  reason?: string;
}

export interface PaginatedTransactions {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(PostCoinLedger.name)
    private postCoinLedgerModel: Model<PostCoinLedgerDocument>,
    @InjectModel(CoinTransaction.name)
    private coinTransactionModel: Model<CoinTransactionDocument>,
  ) {}

  /**
   * Get wallet summary for a user.
   * Aggregates PostCoinLedger records to compute withdrawable and pending balances.
   */
  async getWalletSummary(userId: string): Promise<WalletSummary> {
    const records = await this.postCoinLedgerModel
      .find({ ownerId: userId })
      .exec();

    let withdrawableBalance = 0;
    let pendingBalance = 0;
    let thresholdReachedPostCount = 0;
    const totalPostCount = records.length;

    for (const record of records) {
      if (record.thresholdReached) {
        withdrawableBalance += record.coinBalance;
        thresholdReachedPostCount++;
      } else {
        pendingBalance += record.coinBalance;
      }
    }

    return {
      withdrawableBalance,
      pendingBalance,
      thresholdReachedPostCount,
      totalPostCount,
    };
  }

  /**
   * Get paginated per-post earnings for a user, sorted by coinBalance descending.
   */
  async getPostEarnings(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedPostEarnings> {
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.postCoinLedgerModel
        .find({ ownerId: userId })
        .sort({ coinBalance: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.postCoinLedgerModel.countDocuments({ ownerId: userId }),
    ]);

    const items: PostEarning[] = records.map((r) => ({
      postId: r.postId,
      coinBalance: r.coinBalance,
      thresholdReached: r.thresholdReached,
      thresholdReachedAt: r.thresholdReachedAt,
      converted: r.converted,
    }));

    return { items, total, page, pageSize };
  }

  /**
   * Convert coins from a threshold-reached post.
   * Guards: post must exist, belong to user, have reached threshold, and not already be converted.
   */
  async convertPostCoins(
    userId: string,
    postId: string,
  ): Promise<ConversionResult> {
    const ledger = await this.postCoinLedgerModel
      .findOne({ postId, ownerId: userId })
      .exec();

    if (!ledger) {
      throw new NotFoundException('post_not_found');
    }

    // Ownership guard (belt-and-suspenders — the query already filters by ownerId)
    if (ledger.ownerId !== userId) {
      throw new ForbiddenException('not_post_owner');
    }

    if (!ledger.thresholdReached) {
      throw new UnprocessableEntityException('threshold_not_reached');
    }

    if (ledger.converted) {
      throw new ConflictException('already_converted');
    }

    // Atomically mark as converted
    const updatedLedger = await this.postCoinLedgerModel
      .findOneAndUpdate(
        { postId, ownerId: userId, converted: false },
        { $set: { converted: true, convertedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!updatedLedger) {
      // Race condition: another request converted it first
      throw new ConflictException('already_converted');
    }

    // Create a CoinTransaction record for the conversion
    const txn = await this.coinTransactionModel.create({
      userId,
      amount: updatedLedger.coinBalance,
      eventType: 'conversion',
      relatedPostId: postId,
    });

    return {
      success: true,
      convertedAmount: updatedLedger.coinBalance,
      postId,
      transactionId: txn._id.toString(),
    };
  }

  /**
   * Get paginated transaction history for a user, optionally filtered by relatedPostId.
   * Sorted by createdAt descending.
   */
  async getTransactionHistory(
    userId: string,
    page: number,
    pageSize: number,
    relatedPostId?: string,
  ): Promise<PaginatedTransactions> {
    const filter: Record<string, any> = { userId };
    if (relatedPostId) {
      filter.relatedPostId = relatedPostId;
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.coinTransactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.coinTransactionModel.countDocuments(filter),
    ]);

    return { items, total, page, pageSize };
  }
}
