import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/reaction.dto';

@Controller('posts')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post(':id/react')
  async reactToPost(@Param('id') postId: string, @Body() createReactionDto: CreateReactionDto) {
    console.log('😊 [REACTIONS] POST /posts/:id/react - Adding/toggling reaction to post', {
      postId: postId,
      userId: createReactionDto.userId,
      email: createReactionDto.email,
      reactionType: createReactionDto.type,
      timestamp: new Date().toISOString()
    });
    
    try {
      const reaction = await this.reactionsService.reactToPost(postId, createReactionDto, createReactionDto.userId);
      console.log('✅ [REACTIONS] POST /posts/:id/react - Reaction processed successfully', {
        postId: postId,
        userId: createReactionDto.userId,
        reactionType: createReactionDto.type,
        isReacted: reaction.isReacted,
        currentReaction: reaction.reactionType
      });
      return reaction;
    } catch (error) {
      console.error('❌ [REACTIONS] POST /posts/:id/react - Failed to process reaction', {
        error: error.message,
        postId: postId,
        userId: createReactionDto.userId,
        reactionType: createReactionDto.type
      });
      throw error;
    }
  }

  @Get(':id/user-reaction')
  async getUserReaction(@Param('id') postId: string, @Query('userId') userId: string) {
    console.log('👤 [REACTIONS] GET /posts/:id/user-reaction - Fetching user reaction', {
      postId: postId,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const reactionType = await this.reactionsService.getUserReaction(postId, userId);
      console.log('✅ [REACTIONS] GET /posts/:id/user-reaction - User reaction retrieved', {
        postId: postId,
        userId: userId,
        reactionType: reactionType
      });
      return { reactionType };
    } catch (error) {
      console.error('❌ [REACTIONS] GET /posts/:id/user-reaction - Failed to retrieve user reaction', {
        error: error.message,
        postId: postId,
        userId: userId
      });
      throw error;
    }
  }

  @Get(':id/reactions')
  async getReactions(@Param('id') postId: string) {
    console.log('📊 [REACTIONS] GET /posts/:id/reactions - Fetching post reactions', {
      postId: postId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const reactions = await this.reactionsService.getReactions(postId);
      console.log('✅ [REACTIONS] GET /posts/:id/reactions - Reactions retrieved', {
        postId: postId,
        reactionTypes: Object.keys(reactions),
        totalReactions: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0)
      });
      return reactions;
    } catch (error) {
      console.error('❌ [REACTIONS] GET /posts/:id/reactions - Failed to retrieve reactions', {
        error: error.message,
        postId: postId
      });
      throw error;
    }
  }
}