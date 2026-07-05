import {
  Controller,
  Post,
  Get,
  Param,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  async toggleSubscription(@Request() req) {
    const userId = req.user.userId;
    console.log('🔄 [SUBSCRIPTIONS] POST /subscriptions/toggle - Toggling subscription', {
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.subscriptionsService.toggleSubscription(userId);
      console.log('✅ [SUBSCRIPTIONS] POST /subscriptions/toggle - Subscription toggled successfully', {
        userId,
        isSubscribed: result.isSubscribed,
      });
      return result;
    } catch (error) {
      console.error('❌ [SUBSCRIPTIONS] POST /subscriptions/toggle - Failed to toggle subscription', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  @Get('status/:userId')
  async getSubscriptionStatus(@Param('userId') userId: string) {
    console.log('📊 [SUBSCRIPTIONS] GET /subscriptions/status/:userId - Fetching subscription status', {
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const status = await this.subscriptionsService.getSubscriptionStatus(userId);
      console.log('✅ [SUBSCRIPTIONS] GET /subscriptions/status/:userId - Subscription status retrieved', {
        userId,
        isSubscribed: status.isSubscribed,
        coinBalance: status.coinBalance,
      });
      return status;
    } catch (error) {
      console.error('❌ [SUBSCRIPTIONS] GET /subscriptions/status/:userId - Failed to retrieve subscription status', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}
