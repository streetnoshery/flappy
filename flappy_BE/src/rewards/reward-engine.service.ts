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

/** Coins credited to the user who performs the engagement */
export const ENGAGER_REWARD = 1;
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

    // 4. Credit coins to both users using atomic $inc
    await this.userModel.findOneAndUpdate(
      { userId: engagerId },
      { $inc: { coinBalance: ENGAGER_REWARD } },
    );

    await this.userModel.findOneAndUpdate(
      { userId: postOwnerId },
      { $inc: { coinBalance: OWNER_REWARD } },
    );

    console.log('💰 [REWARD_ENGINE] Coins credited', {
      engagerId,
      engagerCoins: ENGAGER_REWARD,
      postOwnerId,
      ownerCoins: OWNER_REWARD,
    });

    // 5. Record CoinTransaction entries for both parties
    const description = reactionType
      ? `${eventType} (${reactionType}) on post ${postId}`
      : `${eventType} on post ${postId}`;

    const engagerTransaction = await this.coinTransactionModel.create({
      userId: engagerId,
      amount: ENGAGER_REWARD,
      eventType: 'engagement_earned',
      relatedPostId: postId,
      relatedUserId: postOwnerId,
      description: `Earned coins for ${description}`,
    });

    const ownerTransaction = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: OWNER_REWARD,
      eventType: 'engagement_received',
      relatedPostId: postId,
      relatedUserId: engagerId,
      description: `Received coins from ${description}`,
    });

    console.log('📝 [REWARD_ENGINE] Transactions recorded', {
      engagerTransactionId: engagerTransaction._id,
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
      engagerCoins: ENGAGER_REWARD,
      ownerCoins: OWNER_REWARD,
      transactions: [engagerTransaction, ownerTransaction],
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

    // Deduct coins from both users using atomic $inc with negative amounts
    await this.userModel.findOneAndUpdate(
      { userId: engagerId },
      { $inc: { coinBalance: -ENGAGER_REWARD } },
    );

    await this.userModel.findOneAndUpdate(
      { userId: postOwnerId },
      { $inc: { coinBalance: -OWNER_REWARD } },
    );

    console.log('💸 [REWARD_ENGINE] Coins deducted', {
      engagerId,
      engagerDeducted: ENGAGER_REWARD,
      postOwnerId,
      ownerDeducted: OWNER_REWARD,
    });

    // Record reversal CoinTransaction entries
    const description = reactionType
      ? `${eventType} (${reactionType}) reversal on post ${postId}`
      : `${eventType} reversal on post ${postId}`;

    const engagerReversal = await this.coinTransactionModel.create({
      userId: engagerId,
      amount: -ENGAGER_REWARD,
      eventType: 'engagement_reversed',
      relatedPostId: postId,
      relatedUserId: postOwnerId,
      description: `Reversed coins for ${description}`,
    });

    const ownerReversal = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: -OWNER_REWARD,
      eventType: 'engagement_reversed',
      relatedPostId: postId,
      relatedUserId: engagerId,
      description: `Reversed coins from ${description}`,
    });

    console.log('📝 [REWARD_ENGINE] Reversal transactions recorded', {
      engagerReversalId: engagerReversal._id,
      ownerReversalId: ownerReversal._id,
    });

    console.log('✅ [REWARD_ENGINE] Engagement reversal completed', {
      engagerId,
      postOwnerId,
      postId,
    });

    return {
      rewarded: true,
      engagerCoins: -ENGAGER_REWARD,
      ownerCoins: -OWNER_REWARD,
      transactions: [engagerReversal, ownerReversal],
    };
  }
}
