import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { FollowCacheService } from './follow-cache.service';
import { Follow, FollowSchema } from './schemas/follow.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Follow.name, schema: FollowSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FollowController],
  providers: [FollowService, FollowCacheService],
  exports: [FollowService, FollowCacheService],
})
export class FollowModule {}
