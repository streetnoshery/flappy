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
