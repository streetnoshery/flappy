import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InteractionsService } from './interactions.service';
import { CreateCommentDto, CreateReplyDto } from './dto/interaction.dto';

@Controller('posts')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(@Param('id') postId: string, @Request() req: any) {
    console.log('❤️ [INTERACTIONS] POST /posts/:id/like - Liking post', {
      postId: postId,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.likePost(postId, req.user._id);
      console.log('✅ [INTERACTIONS] POST /posts/:id/like - Post liked successfully', {
        postId: postId,
        userId: req.user._id
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/like - Failed to like post', {
        error: error.message,
        postId: postId,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  async commentOnPost(@Param('id') postId: string, @Body() createCommentDto: CreateCommentDto, @Request() req: any) {
    console.log('💬 [INTERACTIONS] POST /posts/:id/comment - Adding comment', {
      postId: postId,
      userId: req.user._id,
      commentLength: createCommentDto.text?.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const comment = await this.interactionsService.commentOnPost(postId, createCommentDto, req.user._id);
      console.log('✅ [INTERACTIONS] POST /posts/:id/comment - Comment added successfully', {
        postId: postId,
        userId: req.user._id,
        commentId: comment._id
      });
      return comment;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/comment - Failed to add comment', {
        error: error.message,
        postId: postId,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Post(':id/comment/:commentId/reply')
  @UseGuards(JwtAuthGuard)
  async replyToComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @Body() createReplyDto: CreateReplyDto,
    @Request() req: any
  ) {
    console.log('↩️ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Adding reply', {
      postId: postId,
      commentId: commentId,
      userId: req.user._id,
      replyLength: createReplyDto.text?.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const comment = await this.interactionsService.replyToComment(commentId, createReplyDto, req.user._id);
      console.log('✅ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Reply added successfully', {
        postId: postId,
        commentId: commentId,
        userId: req.user._id
      });
      return comment;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Failed to add reply', {
        error: error.message,
        postId: postId,
        commentId: commentId,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard)
  async pinPost(@Param('id') postId: string, @Request() req: any) {
    console.log('📌 [INTERACTIONS] POST /posts/:id/pin - Pinning post', {
      postId: postId,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.pinPost(postId, req.user._id);
      console.log('✅ [INTERACTIONS] POST /posts/:id/pin - Post pinned successfully', {
        postId: postId,
        userId: req.user._id
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/pin - Failed to pin post', {
        error: error.message,
        postId: postId,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async savePost(@Param('id') postId: string, @Request() req: any) {
    console.log('💾 [INTERACTIONS] POST /posts/:id/save - Saving post', {
      postId: postId,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.savePost(postId, req.user._id);
      console.log('✅ [INTERACTIONS] POST /posts/:id/save - Post saved successfully', {
        postId: postId,
        userId: req.user._id
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/save - Failed to save post', {
        error: error.message,
        postId: postId,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string) {
    console.log('📝 [INTERACTIONS] GET /posts/:id/comments - Fetching comments', {
      postId: postId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const comments = await this.interactionsService.getComments(postId);
      console.log('✅ [INTERACTIONS] GET /posts/:id/comments - Comments retrieved', {
        postId: postId,
        commentsCount: comments.length
      });
      return comments;
    } catch (error) {
      console.error('❌ [INTERACTIONS] GET /posts/:id/comments - Failed to retrieve comments', {
        error: error.message,
        postId: postId
      });
      throw error;
    }
  }
}