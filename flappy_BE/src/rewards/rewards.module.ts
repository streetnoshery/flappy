import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RewardEngineService } from './reward-engine.service';
import { AbuseDetectorService } from './abuse-detector.service';
import {
  CoinTransaction,
  CoinTransactionSchema,
} from './schemas/coin-transaction.schema';
import { AbuseFlag, AbuseFlagSchema } from './schemas/abuse-flag.schema';
import {
  DailyEngagementCount,
  DailyEngagementCountSchema,
} from './schemas/daily-engagement-count.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoinTransaction.name, schema: CoinTransactionSchema },
      { name: AbuseFlag.name, schema: AbuseFlagSchema },
      { name: DailyEngagementCount.name, schema: DailyEngagementCountSchema },
      { name: User.name, schema: UserSchema },
    ]),
    SubscriptionsModule,
  ],
  providers: [AbuseDetectorService, RewardEngineService],
  exports: [RewardEngineService],
})
export class RewardsModule {}
