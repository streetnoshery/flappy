import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('balance')
  async getBalance(@Request() req) {
    const userId = req.user.userId;
    console.log('💰 [WALLET] GET /wallet/balance - Fetching coin balance', {
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const isSubscribed = await this.subscriptionsService.isSubscribed(userId);
      if (!isSubscribed) {
        console.log('🚫 [WALLET] GET /wallet/balance - User is not subscribed', { userId });
        throw new ForbiddenException('Active subscription required to access wallet features');
      }

      const balance = await this.walletService.getBalance(userId);
      console.log('✅ [WALLET] GET /wallet/balance - Balance retrieved', {
        userId,
        balance,
      });
      return { balance };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ [WALLET] GET /wallet/balance - Failed to retrieve balance', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    console.log('📜 [WALLET] GET /wallet/transactions - Fetching transaction history', {
      userId,
      page: pageNum,
      limit: limitNum,
      timestamp: new Date().toISOString(),
    });

    try {
      const isSubscribed = await this.subscriptionsService.isSubscribed(userId);
      if (!isSubscribed) {
        console.log('🚫 [WALLET] GET /wallet/transactions - User is not subscribed', { userId });
        throw new ForbiddenException('Active subscription required to access wallet features');
      }

      const result = await this.walletService.getTransactions(userId, pageNum, limitNum);
      console.log('✅ [WALLET] GET /wallet/transactions - Transactions retrieved', {
        userId,
        count: result.transactions.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });
      return result;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ [WALLET] GET /wallet/transactions - Failed to retrieve transactions', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  @Post('convert')
  async requestConversion(@Request() req, @Body() body: { amount: number }) {
    const userId = req.user.userId;
    const { amount } = body;

    console.log('🔄 [WALLET] POST /wallet/convert - Requesting coin conversion', {
      userId,
      amount,
      timestamp: new Date().toISOString(),
    });

    try {
      const isSubscribed = await this.subscriptionsService.isSubscribed(userId);
      if (!isSubscribed) {
        console.log('🚫 [WALLET] POST /wallet/convert - User is not subscribed', { userId });
        throw new ForbiddenException('Active subscription required to access wallet features');
      }

      const result = await this.walletService.requestConversion(userId, amount);
      console.log('✅ [WALLET] POST /wallet/convert - Conversion request processed', {
        userId,
        success: result.success,
        coinsConverted: result.conversionRecord?.coinsConverted,
        payoutAmount: result.conversionRecord?.payoutAmount,
      });
      return result;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ [WALLET] POST /wallet/convert - Failed to process conversion', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  @Get('thresholds')
  async getThresholds() {
    console.log('📊 [WALLET] GET /wallet/thresholds - Fetching threshold values', {
      timestamp: new Date().toISOString(),
    });

    try {
      const thresholds = this.walletService.getThresholds();
      console.log('✅ [WALLET] GET /wallet/thresholds - Thresholds retrieved', {
        coinThreshold: thresholds.coinThreshold,
        engagementThreshold: thresholds.engagementThreshold,
        conversionRate: thresholds.conversionRate,
      });
      return thresholds;
    } catch (error) {
      console.error('❌ [WALLET] GET /wallet/thresholds - Failed to retrieve thresholds', {
        error: error.message,
      });
      throw error;
    }
  }
}
