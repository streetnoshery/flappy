import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import {
  PostCoinLedger,
  PostCoinLedgerSchema,
} from '../rewards/schemas/post-coin-ledger.schema';
import {
  CoinTransaction,
  CoinTransactionSchema,
} from '../rewards/schemas/coin-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PostCoinLedger.name, schema: PostCoinLedgerSchema },
      { name: CoinTransaction.name, schema: CoinTransactionSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
