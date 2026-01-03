import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/reaction.dto';

@Controller('posts')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  async reactToPost(@Param('id') postId: string, @Body() createReactionDto: CreateReactionDto, @Request() req: any) {
    console.log('😊 [REACTIONS] POST /posts/:id/react - Adding reaction to post', {
      postId: postId,
      userId: req.user._id,
      reactionType: createReactionDto.type,
      timestamp: new Date().toISOString()
    });
    
    try {
      const reaction = await this.reactionsService.reactToPost(postId, createReactionDto, req.user._id);
      console.log('✅ [REACTIONS] POST /posts/:id/react - Reaction added successfully', {
        postId: postId,
        userId: req.user._id,
        reactionType: createReactionDto.type,
        reactionId: reaction._id
      });
      return reaction;
    } catch (error) {
      console.error('❌ [REACTIONS] POST /posts/:id/react - Failed to add reaction', {
        error: error.message,
        postId: postId,
        userId: req.user._id,
        reactionType: createReactionDto.type
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