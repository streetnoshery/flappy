import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AbuseDetectorService } from './abuse-detector.service';
import {
  CoinTransaction,
  CoinTransactionDocument,
} from './schemas/coin-transaction.schema';
import {
  DailyEngagementCount,
  DailyEngagementCountDocument,
} from './schemas/daily-engagement-count.schema';
import { User } from '../users/schemas/user.schema';

export interface EngagementEvent {
  engagerId: string;
  postId: string;
  postOwnerId: string;
  eventType: 'like' | 'reaction';
  reactionType?: string;
}

export interface RewardResult {
  rewarded: boolean;
  reason?: string;
  engagerCoins?: number;
  ownerCoins?: number;
  transactions?: CoinTransaction[];
}

/** Coins credited to the post owner when their post receives engagement */
export const OWNER_REWARD = 2;

@Injectable()
export class RewardEngineService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly abuseDetectorService: AbuseDetectorService,
    @InjectModel(CoinTransaction.name)
    private coinTransactionModel: Model<CoinTransactionDocument>,
    @InjectModel(DailyEngagementCount.name)
    private dailyEngagementCountModel: Model<DailyEngagementCountDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  /**
   * Process an engagement event and award coins to both parties
   * if eligibility and abuse checks pass.
   *
   * Flow:
   * 1. Check engager is subscribed
   * 2. Check post owner is subscribed
   * 3. Run abuse detection checks
   * 4. Credit coins atomically to both users
   * 5. Record CoinTransaction entries
   * 6. Increment daily engagement count
   */
  async processEngagement(event: EngagementEvent): Promise<RewardResult> {
    const { engagerId, postId, postOwnerId, eventType, reactionType } = event;

    console.log('🎯 [REWARD_ENGINE] Processing engagement', {
      engagerId,
      postId,
      postOwnerId,
      eventType,
      reactionType,
    });

    // 1. Check engager is subscribed
    const engagerSubscribed =
      await this.subscriptionsService.isSubscribed(engagerId);
    if (!engagerSubscribed) {
      console.log('⏭️ [REWARD_ENGINE] Engager not subscribed, skipping reward', {
        engagerId,
      });
      return { rewarded: false, reason: 'not_subscribed' };
    }

    // 2. Check post owner is subscribed
    const ownerSubscribed =
      await this.subscriptionsService.isSubscribed(postOwnerId);
    if (!ownerSubscribed) {
      console.log(
        '⏭️ [REWARD_ENGINE] Post owner not subscribed, skipping reward',
        { postOwnerId },
      );
      return { rewarded: false, reason: 'not_subscribed' };
    }

    // 3. Run abuse detection checks
    const abuseResult = await this.abuseDetectorService.checkEngagement(
      engagerId,
      postId,
      postOwnerId,
    );
    if (!abuseResult.allowed) {
      console.log('🚫 [REWARD_ENGINE] Abuse check failed', {
        engagerId,
        postId,
        reason: abuseResult.reason,
      });
      return { rewarded: false, reason: abuseResult.reason };
    }

    // 4. Credit coins to post owner only using atomic $inc
    await this.userModel.findOneAndUpdate(
      { userId: postOwnerId },
      { $inc: { coinBalance: OWNER_REWARD } },
    );

    console.log('💰 [REWARD_ENGINE] Coins credited to post owner', {
      postOwnerId,
      ownerCoins: OWNER_REWARD,
    });

    // 5. Record CoinTransaction entry for post owner
    const description = reactionType
      ? `${eventType} (${reactionType}) on post ${postId}`
      : `${eventType} on post ${postId}`;

    const ownerTransaction = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: OWNER_REWARD,
      eventType: 'engagement_received',
      relatedPostId: postId,
      relatedUserId: engagerId,
      description: `Received coins from ${description}`,
    });

    console.log('📝 [REWARD_ENGINE] Transaction recorded', {
      ownerTransactionId: ownerTransaction._id,
    });

    // 6. Increment daily engagement count for the engager
    const today = new Date().toISOString().split('T')[0];
    await this.dailyEngagementCountModel.findOneAndUpdate(
      { userId: engagerId, date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );

    console.log('✅ [REWARD_ENGINE] Engagement processed successfully', {
      engagerId,
      postOwnerId,
      postId,
    });

    return {
      rewarded: true,
      engagerCoins: 0,
      ownerCoins: OWNER_REWARD,
      transactions: [ownerTransaction],
    };
  }

  /**
   * Reverse a previously rewarded engagement event.
   * Deducts coins from both parties and records reversal transactions.
   */
  async reverseEngagement(event: EngagementEvent): Promise<RewardResult> {
    const { engagerId, postId, postOwnerId, eventType, reactionType } = event;

    console.log('↩️ [REWARD_ENGINE] Reversing engagement', {
      engagerId,
      postId,
      postOwnerId,
      eventType,
      reactionType,
    });

    // Deduct coins from post owner only using atomic $inc with negative amount
    await this.userModel.findOneAndUpdate(
      { userId: postOwnerId },
      { $inc: { coinBalance: -OWNER_REWARD } },
    );

    console.log('💸 [REWARD_ENGINE] Coins deducted from post owner', {
      postOwnerId,
      ownerDeducted: OWNER_REWARD,
    });

    // Record reversal CoinTransaction entry for post owner
    const description = reactionType
      ? `${eventType} (${reactionType}) reversal on post ${postId}`
      : `${eventType} reversal on post ${postId}`;

    const ownerReversal = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: -OWNER_REWARD,
      eventType: 'engagement_reversed',
      relatedPostId: postId,
      relatedUserId: engagerId,
      description: `Reversed coins from ${description}`,
    });

    console.log('📝 [REWARD_ENGINE] Reversal transaction recorded', {
      ownerReversalId: ownerReversal._id,
    });

    console.log('✅ [REWARD_ENGINE] Engagement reversal completed', {
      engagerId,
      postOwnerId,
      postId,
    });

    return {
      rewarded: true,
      engagerCoins: 0,
      ownerCoins: -OWNER_REWARD,
      transactions: [ownerReversal],
    };
  }
}
