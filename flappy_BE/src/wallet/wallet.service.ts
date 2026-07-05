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
import { Post } from '../posts/schemas/post.schema';

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
    @InjectModel(Post.name)
    private postModel: Model<Post>,
  ) {}

  /**
   * Get wallet summary for a user.
   * Aggregates PostCoinLedger records to compute withdrawable and pending balances.
   * Falls back to CoinTransaction aggregation if no ledger records exist yet.
   */
  async getWalletSummary(userId: string): Promise<WalletSummary> {
    const records = await this.postCoinLedgerModel
      .find({ ownerId: userId })
      .exec();

    // If ledger records exist, use them as the source of truth
    if (records.length > 0) {
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

    // No ledger records yet — fall back to CoinTransaction aggregation.
    // First find all posts owned by this user, then sum transactions per post.
    const userPosts = await this.postModel
      .find({ userId }, '_id')
      .lean()
      .exec();

    if (userPosts.length === 0) {
      return {
        withdrawableBalance: 0,
        pendingBalance: 0,
        thresholdReachedPostCount: 0,
        totalPostCount: 0,
      };
    }

    const postIds = userPosts.map((p) => p._id.toString());

    const txAgg = await this.coinTransactionModel.aggregate([
      {
        $match: {
          relatedPostId: { $in: postIds },
          eventType: { $in: ['engagement_received', 'engagement_reversed'] },
        },
      },
      {
        $group: {
          _id: '$relatedPostId',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let withdrawableBalance = 0;
    let pendingBalance = 0;
    let thresholdReachedPostCount = 0;
    const totalPostCount = txAgg.length;

    for (const row of txAgg) {
      const balance = Math.max(0, row.total);
      if (balance >= 1000) {
        withdrawableBalance += balance;
        thresholdReachedPostCount++;
      } else {
        pendingBalance += balance;
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
   * Get the coin balance for a single post (owner-only use).
   * Falls back to aggregating CoinTransaction records if no PostCoinLedger
   * record exists yet (handles coins earned before the ledger was introduced).
   */
  async getPostCoinBalance(
    postId: string,
  ): Promise<{ postId: string; coinBalance: number; thresholdReached: boolean }> {
    const record = await this.postCoinLedgerModel
      .findOne({ postId })
      .exec();

    if (record) {
      return {
        postId: record.postId,
        coinBalance: record.coinBalance,
        thresholdReached: record.thresholdReached,
      };
    }

    // No ledger record yet — aggregate from CoinTransaction history
    const result = await this.coinTransactionModel.aggregate([
      {
        $match: {
          relatedPostId: postId,
          eventType: { $in: ['engagement_received', 'engagement_reversed'] },
        },
      },
      { $group: { _id: '$relatedPostId', total: { $sum: '$amount' } } },
    ]);

    const coinBalance = result.length > 0 ? Math.max(0, result[0].total) : 0;

    return {
      postId,
      coinBalance,
      thresholdReached: coinBalance >= 1000,
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
