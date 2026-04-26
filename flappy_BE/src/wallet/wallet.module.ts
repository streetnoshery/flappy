import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import {
  ConversionRecord,
  ConversionRecordSchema,
} from './schemas/conversion-record.schema';
import {
  CoinTransaction,
  CoinTransactionSchema,
} from '../rewards/schemas/coin-transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversionRecord.name, schema: ConversionRecordSchema },
      { name: CoinTransaction.name, schema: CoinTransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    SubscriptionsModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
