import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InteractionsService } from './interactions.service';
import { CreateCommentDto, CreateReplyDto } from './dto/interaction.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SecurityAuditService } from '../common/services/security-audit.service';

@Controller('posts')
export class InteractionsController {
  constructor(
    private readonly interactionsService: InteractionsService,
    private readonly auditService: SecurityAuditService,
  ) {}

  /** POST /posts/:id/like — actor from JWT, never body */
  @Post(':id/like')
  async likePost(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.interactionsService.likePost(postId, actor.userId);
  }

  /**
   * GET /posts/:id/likes
   * currentUserId from JWT — never accepted from query param (prevents spoofing).
   */
  @Get(':id/likes')
  async getPostLikes(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.interactionsService.getPostLikes(postId, actor.userId);
  }

  /** POST /posts/:id/comment — actor from JWT */
  @Post(':id/comment')
  async commentOnPost(
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const comment = await this.interactionsService.commentOnPost(postId, dto, actor.userId);
    return { data: comment };
  }

  /** POST /posts/:id/comment/:commentId/reply — actor from JWT */
  @Post(':id/comment/:commentId/reply')
  async replyToComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const comment = await this.interactionsService.replyToComment(commentId, dto, actor.userId);
    return { data: comment };
  }

  /** POST /posts/:id/pin — actor from JWT */
  @Post(':id/pin')
  async pinPost(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.interactionsService.pinPost(postId, actor.userId);
  }

  /** POST /posts/:id/save — actor from JWT */
  @Post(':id/save')
  async savePost(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.interactionsService.savePost(postId, actor.userId);
  }

  /**
   * GET /posts/user/:userId/bookmarks
   * Enforces: actor can only view their OWN bookmarks.
   * Return 404 (not 403) to avoid leaking whether another user's bookmarks exist.
   */
  @Get('user/:userId/bookmarks')
  async getUserBookmarks(
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (actor.userId !== userId) {
      this.auditService.logDenied({
        actorId: actor.userId,
        resource: 'bookmarks',
        resourceId: userId,
        action: 'GET bookmarks',
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });
      throw new NotFoundException('Resource not found');
    }
    return { data: await this.interactionsService.getUserBookmarks(actor.userId) };
  }

  /**
   * GET /posts/:id/bookmark-status
   * Only returns the status for the authenticated user — ignores any userId query param.
   */
  @Get(':id/bookmark-status')
  async getBookmarkStatus(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.interactionsService.getBookmarkStatus(postId, actor.userId);
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string) {
    return { data: await this.interactionsService.getComments(postId) };
  }
}
