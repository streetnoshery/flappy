import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FollowService } from './follow.service';

@Controller('users')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  /** POST /users/:id/follow  — toggle follow/unfollow */
  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  async toggleFollow(
    @Param('id') targetUserId: string,
    @Body('userId') currentUserId: string,
  ) {
    return this.followService.toggleFollow(currentUserId, targetUserId);
  }

  /** GET /users/:id/stats?currentUserId=xxx — follower/following counts + isFollowing */
  @Get(':id/stats')
  getProfileStats(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.followService.getProfileStats(userId, currentUserId);
  }

  /** GET /users/:id/followers?currentUserId=xxx */
  @Get(':id/followers')
  async getFollowers(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.followService.getFollowers(userId, currentUserId);
  }

  /** GET /users/:id/following?currentUserId=xxx */
  @Get(':id/following')
  async getFollowing(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.followService.getFollowing(userId, currentUserId);
  }
}
