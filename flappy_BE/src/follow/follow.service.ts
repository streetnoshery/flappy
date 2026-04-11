import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Follow, FollowDocument } from './schemas/follow.schema';
import { FollowCacheService } from './follow-cache.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly cache: FollowCacheService,
  ) {}

  /** Toggle follow — returns new state */
  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Verify target user exists
    const targetUser = await this.userModel
      .findOne({ userId: followingId })
      .select('userId username')
      .lean();
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const isCurrentlyFollowing = this.cache.isFollowing(followerId, followingId);

    if (isCurrentlyFollowing) {
      // Unfollow: delete from DB, then update cache
      await this.followModel.deleteOne({ followerId, followingId });
      this.cache.removeFollow(followerId, followingId);
      this.logger.log(`${followerId} unfollowed ${followingId}`);
    } else {
      // Follow: insert into DB, then update cache
      await this.followModel.create({ followerId, followingId });
      this.cache.addFollow(followerId, followingId);
      this.logger.log(`${followerId} followed ${followingId}`);
    }

    return {
      isFollowing: !isCurrentlyFollowing,
      followerCount: this.cache.getFollowerCount(followingId),
      followingCount: this.cache.getFollowingCount(followingId),
    };
  }

  /** Get profile stats — all from cache, zero DB calls */
  getProfileStats(userId: string, currentUserId?: string) {
    return {
      followerCount: this.cache.getFollowerCount(userId),
      followingCount: this.cache.getFollowingCount(userId),
      isFollowing: currentUserId
        ? this.cache.isFollowing(currentUserId, userId)
        : false,
    };
  }

  /** Get followers list with user details */
  async getFollowers(userId: string, currentUserId?: string) {
    const followerIds = this.cache.getFollowerIds(userId);

    if (followerIds.length === 0) return [];

    const users = await this.userModel
      .find({ userId: { $in: followerIds } })
      .select('userId username profilePhotoUrl bio')
      .lean();

    return users.map((u) => ({
      ...u,
      isFollowing: currentUserId
        ? this.cache.isFollowing(currentUserId, u.userId)
        : false,
    }));
  }

  /** Get following list with user details */
  async getFollowing(userId: string, currentUserId?: string) {
    const followingIds = this.cache.getFollowingIds(userId);

    if (followingIds.length === 0) return [];

    const users = await this.userModel
      .find({ userId: { $in: followingIds } })
      .select('userId username profilePhotoUrl bio')
      .lean();

    return users.map((u) => ({
      ...u,
      isFollowing: currentUserId
        ? this.cache.isFollowing(currentUserId, u.userId)
        : false,
    }));
  }
}
