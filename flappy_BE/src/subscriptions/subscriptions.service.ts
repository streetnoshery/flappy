import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { User } from '../users/schemas/user.schema';

export interface SubscriptionResult {
  isSubscribed: boolean;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscribedAt?: Date;
  coinBalance: number;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Toggle subscription status for a user.
   * If currently subscribed, unsubscribe. If not subscribed, subscribe.
   * Updates both the Subscription document (upsert) and the User document atomically.
   */
  async toggleSubscription(userId: string): Promise<SubscriptionResult> {
    console.log('🔄 [SUBSCRIPTIONS_SERVICE] Toggling subscription', { userId });

    // Verify the user exists
    const user = await this.userModel.findOne({ userId });
    if (!user) {
      console.log('❌ [SUBSCRIPTIONS_SERVICE] User not found', { userId });
      throw new NotFoundException('User not found');
    }

    // Get current subscription state
    const existingSub = await this.subscriptionModel.findOne({ userId });
    const isCurrentlySubscribed = existingSub?.isActive ?? false;

    const now = new Date();

    if (isCurrentlySubscribed) {
      // Unsubscribe: set isActive=false, record unsubscribedAt
      await this.subscriptionModel.findOneAndUpdate(
        { userId },
        {
          isActive: false,
          unsubscribedAt: now,
        },
      );

      await this.userModel.findOneAndUpdate(
        { userId },
        {
          isSubscribed: false,
        },
      );

      console.log('✅ [SUBSCRIPTIONS_SERVICE] User unsubscribed', { userId, unsubscribedAt: now });

      return {
        isSubscribed: false,
        unsubscribedAt: now,
      };
    } else {
      // Subscribe: upsert Subscription doc with isActive=true, record subscribedAt
      await this.subscriptionModel.findOneAndUpdate(
        { userId },
        {
          isActive: true,
          subscribedAt: now,
          $unset: { unsubscribedAt: '' },
        },
        { upsert: true, new: true },
      );

      await this.userModel.findOneAndUpdate(
        { userId },
        {
          isSubscribed: true,
          subscribedAt: now,
        },
      );

      console.log('✅ [SUBSCRIPTIONS_SERVICE] User subscribed', { userId, subscribedAt: now });

      return {
        isSubscribed: true,
        subscribedAt: now,
      };
    }
  }

  /**
   * Check if a user is currently subscribed.
   */
  async isSubscribed(userId: string): Promise<boolean> {
    console.log('🔍 [SUBSCRIPTIONS_SERVICE] Checking subscription status', { userId });

    const subscription = await this.subscriptionModel.findOne({ userId });
    const subscribed = subscription?.isActive ?? false;

    console.log('✅ [SUBSCRIPTIONS_SERVICE] Subscription check result', { userId, isSubscribed: subscribed });

    return subscribed;
  }

  /**
   * Get full subscription status including coinBalance.
   * Returns isSubscribed, subscribedAt, and coinBalance.
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    console.log('📊 [SUBSCRIPTIONS_SERVICE] Getting subscription status', { userId });

    const user = await this.userModel.findOne({ userId });
    if (!user) {
      console.log('❌ [SUBSCRIPTIONS_SERVICE] User not found', { userId });
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionModel.findOne({ userId });

    const status: SubscriptionStatus = {
      isSubscribed: subscription?.isActive ?? false,
      subscribedAt: subscription?.subscribedAt,
      coinBalance: user.coinBalance ?? 0,
    };

    console.log('✅ [SUBSCRIPTIONS_SERVICE] Subscription status retrieved', {
      userId,
      isSubscribed: status.isSubscribed,
      coinBalance: status.coinBalance,
    });

    return status;
  }
}
