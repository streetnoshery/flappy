import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('summary')
  async getSummary(@Request() req) {
    const userId = req.user.userId;
    return this.walletService.getWalletSummary(userId);
  }

  @Get('posts')
  async getPostEarnings(
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.walletService.getPostEarnings(userId, pageNum, pageSizeNum);
  }

  /**
   * GET /wallet/posts/:postId/coins
   * Returns the coin balance for a specific post.
   * Only the post owner should call this — the frontend enforces visibility.
   */
  @Get('posts/:postId/coins')
  async getPostCoins(@Param('postId') postId: string) {
    return this.walletService.getPostCoinBalance(postId);
  }

  @Post('convert/:postId')
  async convertPostCoins(@Request() req, @Param('postId') postId: string) {
    const userId = req.user.userId;
    return this.walletService.convertPostCoins(userId, postId);
  }

  @Get('transactions')
  async getTransactionHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('postId') postId?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.walletService.getTransactionHistory(
      userId,
      pageNum,
      pageSizeNum,
      postId,
    );
  }
}
