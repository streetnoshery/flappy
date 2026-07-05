import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DailyEngagementCount,
  DailyEngagementCountDocument,
} from './schemas/daily-engagement-count.schema';
import { AbuseFlag, AbuseFlagDocument } from './schemas/abuse-flag.schema';
import {
  CoinTransaction,
  CoinTransactionDocument,
} from './schemas/coin-transaction.schema';
import { User } from '../users/schemas/user.schema';

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string; // 'rate_limit' | 'duplicate' | 'self_engagement' | 'flagged'
}

export interface FarmingCheckResult {
  detected: boolean;
  flaggedUsers: string[];
  reason?: string;
}

export const MAX_DAILY_ENGAGEMENTS = 50;

/** Minimum number of recent transactions required before farming analysis runs */
export const MIN_TRANSACTIONS_FOR_FARMING_CHECK = 5;

/** Concentration threshold — if >80% of engagements go to a small group, it's suspicious */
export const FARMING_CONCENTRATION_THRESHOLD = 0.8;

/** Maximum group size considered "small closed group" */
export const FARMING_MAX_GROUP_SIZE = 4;

/** Number of days to look back for farming analysis */
export const FARMING_LOOKBACK_DAYS = 7;

/** Maximum number of recent transactions to analyze */
export const FARMING_MAX_TRANSACTIONS = 100;

@Injectable()
export class AbuseDetectorService {
  constructor(
    @InjectModel(DailyEngagementCount.name)
    private dailyEngagementCountModel: Model<DailyEngagementCountDocument>,
    @InjectModel(AbuseFlag.name)
    private abuseFlagModel: Model<AbuseFlagDocument>,
    @InjectModel(CoinTransaction.name)
    private coinTransactionModel: Model<CoinTransactionDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  /**
   * Check whether an engagement event should be rewarded.
   * Runs checks in order: self-engagement → flagged account → duplicate → rate limit.
   */
  async checkEngagement(
    engagerId: string,
    postId: string,
    postOwnerId: string,
  ): Promise<AbuseCheckResult> {
    console.log('🔍 [ABUSE_DETECTOR] Checking engagement', {
      engagerId,
      postId,
      postOwnerId,
    });

    // 1. Self-engagement prevention
    if (engagerId === postOwnerId) {
      console.log('🚫 [ABUSE_DETECTOR] Self-engagement detected', {
        engagerId,
      });
      return { allowed: false, reason: 'self_engagement' };
    }

    // 2. Flagged account check
    const flagged = await this.isAccountFlagged(engagerId);
    if (flagged) {
      console.log('🚫 [ABUSE_DETECTOR] Flagged account detected', {
        engagerId,
      });
      return { allowed: false, reason: 'flagged' };
    }

    // 3. Duplicate engagement prevention (same user + same post)
    const existingTransaction = await this.coinTransactionModel.findOne({
      userId: engagerId,
      relatedPostId: postId,
      eventType: 'engagement_earned',
    });

    if (existingTransaction) {
      console.log('🚫 [ABUSE_DETECTOR] Duplicate engagement detected', {
        engagerId,
        postId,
      });
      return { allowed: false, reason: 'duplicate' };
    }

    // 4. Daily rate limit check
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyCount = await this.dailyEngagementCountModel.findOne({
      userId: engagerId,
      date: today,
    });

    if (dailyCount && dailyCount.count >= MAX_DAILY_ENGAGEMENTS) {
      console.log('🚫 [ABUSE_DETECTOR] Daily rate limit exceeded', {
        engagerId,
        count: dailyCount.count,
        max: MAX_DAILY_ENGAGEMENTS,
      });
      return { allowed: false, reason: 'rate_limit' };
    }

    console.log('✅ [ABUSE_DETECTOR] Engagement allowed', {
      engagerId,
      postId,
    });
    return { allowed: true };
  }

  /**
   * Flag an account for abuse. Creates an AbuseFlag document
   * and sets rewardsSuspended on the User.
   */
  async flagAccount(userId: string, reason: string): Promise<void> {
    console.log('🚩 [ABUSE_DETECTOR] Flagging account', { userId, reason });

    await this.abuseFlagModel.create({
      userId,
      reason,
      status: 'pending_review',
    });

    await this.userModel.findOneAndUpdate(
      { userId },
      { rewardsSuspended: true },
    );

    console.log('✅ [ABUSE_DETECTOR] Account flagged', { userId, reason });
  }

  /**
   * Detect engagement farming patterns for a given user.
   *
   * Engagement farming = reciprocal engagement between a small closed group
   * (e.g., 2-4 users exclusively engaging with each other).
   *
   * Algorithm:
   * 1. Query recent engagement_earned transactions for the engager (last 7 days, max 100)
   * 2. Build a frequency map of who the engager sends engagements to
   * 3. Identify the top recipients and check if engagement is concentrated (>80%)
   * 4. For each top recipient, check if they also engage back with the engager
   * 5. If reciprocal concentration is found among a small group, flag all involved
   */
  async checkEngagementFarming(
    engagerId: string,
  ): Promise<FarmingCheckResult> {
    console.log('🔍 [ABUSE_DETECTOR] Checking engagement farming', {
      engagerId,
    });

    // 1. Query recent engagement transactions for the engager
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - FARMING_LOOKBACK_DAYS);

    const recentTransactions = await this.coinTransactionModel
      .find({
        userId: engagerId,
        eventType: 'engagement_earned',
        createdAt: { $gte: lookbackDate },
      })
      .sort({ createdAt: -1 })
      .limit(FARMING_MAX_TRANSACTIONS)
      .exec();

    // Not enough data to determine farming
    if (recentTransactions.length < MIN_TRANSACTIONS_FOR_FARMING_CHECK) {
      console.log(
        '⏭️ [ABUSE_DETECTOR] Not enough transactions for farming check',
        { engagerId, count: recentTransactions.length },
      );
      return { detected: false, flaggedUsers: [] };
    }

    // 2. Build frequency map: relatedUserId → count of engagements
    const engagementCounts = new Map<string, number>();
    for (const tx of recentTransactions) {
      if (tx.relatedUserId) {
        engagementCounts.set(
          tx.relatedUserId,
          (engagementCounts.get(tx.relatedUserId) || 0) + 1,
        );
      }
    }

    const totalEngagements = recentTransactions.length;

    // 3. Sort recipients by engagement count (descending) and check concentration
    const sortedRecipients = Array.from(engagementCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    // Check if top N recipients (up to FARMING_MAX_GROUP_SIZE - 1, excluding the engager)
    // receive more than the concentration threshold of all engagements
    const topGroupSize = Math.min(
      sortedRecipients.length,
      FARMING_MAX_GROUP_SIZE - 1, // -1 because the engager is part of the group
    );

    let topGroupEngagements = 0;
    const topRecipients: string[] = [];
    for (let i = 0; i < topGroupSize; i++) {
      topGroupEngagements += sortedRecipients[i][1];
      topRecipients.push(sortedRecipients[i][0]);
    }

    const concentrationRatio = topGroupEngagements / totalEngagements;

    if (concentrationRatio < FARMING_CONCENTRATION_THRESHOLD) {
      console.log('✅ [ABUSE_DETECTOR] Engagement is diverse, no farming', {
        engagerId,
        concentrationRatio,
        threshold: FARMING_CONCENTRATION_THRESHOLD,
      });
      return { detected: false, flaggedUsers: [] };
    }

    // 4. Check reciprocity — do the top recipients also engage back with the engager?
    const reciprocalUsers: string[] = [];

    for (const recipientId of topRecipients) {
      const reciprocalTransactions = await this.coinTransactionModel
        .find({
          userId: recipientId,
          relatedUserId: engagerId,
          eventType: 'engagement_earned',
          createdAt: { $gte: lookbackDate },
        })
        .limit(1)
        .exec();

      if (reciprocalTransactions.length > 0) {
        reciprocalUsers.push(recipientId);
      }
    }

    // Need at least 1 reciprocal user to form a farming ring
    if (reciprocalUsers.length === 0) {
      console.log(
        '✅ [ABUSE_DETECTOR] Concentrated but no reciprocity, not farming',
        { engagerId, topRecipients },
      );
      return { detected: false, flaggedUsers: [] };
    }

    // 5. Farming detected — flag all involved users
    const allInvolvedUsers = [engagerId, ...reciprocalUsers];
    const reason = `Engagement farming detected: reciprocal engagement concentrated among ${allInvolvedUsers.length} users (concentration: ${(concentrationRatio * 100).toFixed(1)}%)`;

    console.log('🚩 [ABUSE_DETECTOR] Engagement farming detected', {
      engagerId,
      reciprocalUsers,
      concentrationRatio,
    });

    for (const userId of allInvolvedUsers) {
      // Only flag if not already flagged
      const alreadyFlagged = await this.isAccountFlagged(userId);
      if (!alreadyFlagged) {
        await this.flagAccount(userId, reason);
      }
    }

    return {
      detected: true,
      flaggedUsers: allInvolvedUsers,
      reason,
    };
  }

  /**
   * Check if a user account has a pending_review abuse flag.
   */
  async isAccountFlagged(userId: string): Promise<boolean> {
    console.log('🔍 [ABUSE_DETECTOR] Checking if account is flagged', {
      userId,
    });

    const flag = await this.abuseFlagModel.findOne({
      userId,
      status: 'pending_review',
    });

    const isFlagged = !!flag;

    console.log('✅ [ABUSE_DETECTOR] Account flagged check result', {
      userId,
      isFlagged,
    });

    return isFlagged;
  }
}
