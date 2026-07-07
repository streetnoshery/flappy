import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('summary')
  async getSummary(@CurrentUser() actor: AuthenticatedUser) {
    return this.walletService.getWalletSummary(actor.userId);
  }

  @Get('posts')
  async getPostEarnings(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.walletService.getPostEarnings(
      actor.userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * GET /wallet/posts/:postId/coins
   * Ownership verified in service: post must belong to actor.userId.
   * Returns 404 if the post doesn't exist or isn't owned by the actor.
   */
  @Get('posts/:postId/coins')
  async getPostCoins(
    @Param('postId') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.walletService.getPostCoinBalance(postId, actor.userId);
  }

  @Post('convert/:postId')
  async convertPostCoins(
    @Param('postId') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.walletService.convertPostCoins(actor.userId, postId);
  }

  @Get('transactions')
  async getTransactionHistory(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('postId') postId?: string,
  ) {
    return this.walletService.getTransactionHistory(
      actor.userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      postId,
    );
  }
}
