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
import {
  PostCoinLedger,
  PostCoinLedgerDocument,
} from './schemas/post-coin-ledger.schema';

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
  postCoinBalance?: number;
  thresholdJustReached?: boolean;
}

/** Coins credited to the post owner when their post receives engagement */
export const OWNER_REWARD = 2;

/** Minimum coins a post must accumulate before becoming withdrawable */
export const COIN_THRESHOLD = 1000;

@Injectable()
export class RewardEngineService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly abuseDetectorService: AbuseDetectorService,
    @InjectModel(CoinTransaction.name)
    private coinTransactionModel: Model<CoinTransactionDocument>,
    @InjectModel(DailyEngagementCount.name)
    private dailyEngagementCountModel: Model<DailyEngagementCountDocument>,
    @InjectModel(PostCoinLedger.name)
    private postCoinLedgerModel: Model<PostCoinLedgerDocument>,
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

    // 4. Atomically increment PostCoinLedger.coinBalance (upsert — creates record if first engagement)
    const updatedLedger = await this.postCoinLedgerModel.findOneAndUpdate(
      { postId, ownerId: postOwnerId },
      { $inc: { coinBalance: OWNER_REWARD } },
      { upsert: true, new: true },
    );

    const newCoinBalance = updatedLedger.coinBalance;
    const previousBalance = newCoinBalance - OWNER_REWARD;

    console.log('💰 [REWARD_ENGINE] PostCoinLedger updated', {
      postId,
      postOwnerId,
      newCoinBalance,
    });

    // 5. Check if threshold was just crossed; if so, mark thresholdReached
    let thresholdJustReached = false;
    if (newCoinBalance >= COIN_THRESHOLD && previousBalance < COIN_THRESHOLD) {
      thresholdJustReached = true;
      await this.postCoinLedgerModel.findOneAndUpdate(
        { postId, ownerId: postOwnerId },
        { $set: { thresholdReached: true, thresholdReachedAt: new Date() } },
      );
      console.log('🏆 [REWARD_ENGINE] Coin threshold reached for post', {
        postId,
        postOwnerId,
        coinBalance: newCoinBalance,
      });
    }

    // 6. Record CoinTransaction entry for post owner
    const description = reactionType
      ? `${eventType} (${reactionType}) on post ${postId}`
      : `${eventType} on post ${postId}`;

    const ownerTransaction = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: OWNER_REWARD,
      eventType: 'engagement_received',
      relatedPostId: postId,
      relatedUserId: engagerId,
      postCoinBalanceAfter: newCoinBalance,
      description: `Received coins from ${description}`,
    });

    console.log('📝 [REWARD_ENGINE] Transaction recorded', {
      ownerTransactionId: ownerTransaction._id,
    });

    const transactions: CoinTransaction[] = [ownerTransaction];

    // 7. If threshold just crossed, create a post_threshold_reached transaction
    if (thresholdJustReached) {
      const thresholdTransaction = await this.coinTransactionModel.create({
        userId: postOwnerId,
        amount: 0,
        eventType: 'post_threshold_reached',
        relatedPostId: postId,
        postCoinBalanceAfter: newCoinBalance,
        description: `Post ${postId} reached the ${COIN_THRESHOLD}-coin threshold`,
      });
      transactions.push(thresholdTransaction);
      console.log('📝 [REWARD_ENGINE] Threshold transaction recorded', {
        thresholdTransactionId: thresholdTransaction._id,
      });
    }

    // 8. Increment daily engagement count for the engager
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
      transactions,
      postCoinBalance: newCoinBalance,
      thresholdJustReached,
    };
  }

  /**
   * Reverse a previously rewarded engagement event.
   * Deducts coins from the post ledger and records a reversal transaction.
   *
   * Flow:
   * 1. Fetch PostCoinLedger; if converted, return already_converted error
   * 2. Atomically decrement PostCoinLedger.coinBalance by OWNER_REWARD
   * 3. If balance drops below threshold and thresholdReached was true, reset flag
   * 4. Record CoinTransaction with postCoinBalanceAfter
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

    // 1. Fetch the current PostCoinLedger record to check converted guard
    const preLedger = await this.postCoinLedgerModel.findOne({
      postId,
      ownerId: postOwnerId,
    });

    if (preLedger?.converted) {
      console.log(
        '🚫 [REWARD_ENGINE] Reversal blocked — post coins already converted',
        { postId, postOwnerId },
      );
      return { rewarded: false, reason: 'already_converted' };
    }

    // 2. Atomically decrement PostCoinLedger.coinBalance
    const updatedLedger = await this.postCoinLedgerModel.findOneAndUpdate(
      { postId, ownerId: postOwnerId },
      { $inc: { coinBalance: -OWNER_REWARD } },
      { new: true },
    );

    const newCoinBalance = updatedLedger?.coinBalance ?? 0;

    console.log('💸 [REWARD_ENGINE] Coins deducted from PostCoinLedger', {
      postOwnerId,
      ownerDeducted: OWNER_REWARD,
      newCoinBalance,
    });

    // 3. If balance dropped below threshold and thresholdReached was previously true, reset it
    if (newCoinBalance < COIN_THRESHOLD && preLedger?.thresholdReached) {
      await this.postCoinLedgerModel.findOneAndUpdate(
        { postId, ownerId: postOwnerId },
        { $set: { thresholdReached: false } },
      );
      console.log(
        '📉 [REWARD_ENGINE] Threshold reset — balance dropped below threshold',
        { postId, postOwnerId, newCoinBalance },
      );
    }

    // 4. Record reversal CoinTransaction entry for post owner
    const description = reactionType
      ? `${eventType} (${reactionType}) reversal on post ${postId}`
      : `${eventType} reversal on post ${postId}`;

    const ownerReversal = await this.coinTransactionModel.create({
      userId: postOwnerId,
      amount: -OWNER_REWARD,
      eventType: 'engagement_reversed',
      relatedPostId: postId,
      relatedUserId: engagerId,
      postCoinBalanceAfter: newCoinBalance,
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
      postCoinBalance: newCoinBalance,
    };
  }
}
