import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  /**
   * POST /users/:id/follow
   * follower = verified JWT actor — never from request body.
   * target  = URL param (whose profile is being followed).
   */
  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  async toggleFollow(
    @Param('id') targetUserId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.followService.toggleFollow(actor.userId, targetUserId);
  }

  /**
   * GET /users/:id/stats
   * currentUserId from JWT for isFollowing enrichment — not from query param.
   */
  @Get(':id/stats')
  getProfileStats(
    @Param('id') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.followService.getProfileStats(userId, actor.userId);
  }

  /** GET /users/:id/followers */
  @Get(':id/followers')
  async getFollowers(
    @Param('id') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.followService.getFollowers(userId, actor.userId);
  }

  /** GET /users/:id/following */
  @Get(':id/following')
  async getFollowing(
    @Param('id') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.followService.getFollowing(userId, actor.userId);
  }
}
