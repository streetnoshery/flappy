import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/reaction.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('posts')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  /** POST /posts/:id/react — actor always from JWT, never from body */
  @Post(':id/react')
  async reactToPost(
    @Param('id') postId: string,
    @Body() dto: CreateReactionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reactionsService.reactToPost(postId, dto, actor.userId);
  }

  /**
   * GET /posts/:id/user-reaction
   * Returns the reaction for the authenticated user only.
   * Ignores any userId query param to prevent cross-user reaction reads.
   */
  @Get(':id/user-reaction')
  async getUserReaction(
    @Param('id') postId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const reactionType = await this.reactionsService.getUserReaction(postId, actor.userId);
    return { reactionType };
  }

  @Get(':id/reactions')
  async getReactions(@Param('id') postId: string) {
    return this.reactionsService.getReactions(postId);
  }
}
