import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body,
  Query
} from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CreateCommentDto, CreateReplyDto, LikePostDto, PinPostDto, SavePostDto } from './dto/interaction.dto';

@Controller('posts')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post(':id/like')
  async likePost(@Param('id') postId: string, @Body() likePostDto: LikePostDto) {
    console.log('❤️ [INTERACTIONS] POST /posts/:id/like - Toggling like on post', {
      postId: postId,
      userId: likePostDto.userId,
      email: likePostDto.email,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.likePost(postId, likePostDto.userId);
      console.log('✅ [INTERACTIONS] POST /posts/:id/like - Like toggled successfully', {
        postId: postId,
        userId: likePostDto.userId,
        isLiked: result.isLiked,
        likeCount: result.likeCount
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/like - Failed to toggle like', {
        error: error.message,
        postId: postId,
        userId: likePostDto.userId
      });
      throw error;
    }
  }

  @Get(':id/likes')
  async getPostLikes(@Param('id') postId: string, @Query('userId') userId?: string) {
    console.log('📊 [INTERACTIONS] GET /posts/:id/likes - Fetching like information', {
      postId: postId,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.getPostLikes(postId, userId);
      console.log('✅ [INTERACTIONS] GET /posts/:id/likes - Like information retrieved', {
        postId: postId,
        likeCount: result.likeCount,
        isLiked: result.isLiked
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] GET /posts/:id/likes - Failed to retrieve like information', {
        error: error.message,
        postId: postId
      });
      throw error;
    }
  }

  @Post(':id/comment')
  async commentOnPost(@Param('id') postId: string, @Body() createCommentDto: CreateCommentDto) {
    console.log('💬 [INTERACTIONS] POST /posts/:id/comment - Adding comment', {
      postId: postId,
      userId: createCommentDto.userId,
      email: createCommentDto.email,
      commentLength: createCommentDto.text?.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const comment = await this.interactionsService.commentOnPost(postId, createCommentDto, createCommentDto.userId);
      console.log('✅ [INTERACTIONS] POST /posts/:id/comment - Comment added successfully', {
        postId: postId,
        userId: createCommentDto.userId,
        commentId: comment._id
      });
      return { data: comment };
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/comment - Failed to add comment', {
        error: error.message,
        postId: postId,
        userId: createCommentDto.userId
      });
      throw error;
    }
  }

  @Post(':id/comment/:commentId/reply')
  async replyToComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @Body() createReplyDto: CreateReplyDto
  ) {
    console.log('↩️ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Adding reply', {
      postId: postId,
      commentId: commentId,
      userId: createReplyDto.userId,
      email: createReplyDto.email,
      replyLength: createReplyDto.text?.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const comment = await this.interactionsService.replyToComment(commentId, createReplyDto, createReplyDto.userId);
      console.log('✅ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Reply added successfully', {
        postId: postId,
        commentId: commentId,
        userId: createReplyDto.userId
      });
      return { data: comment };
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/comment/:commentId/reply - Failed to add reply', {
        error: error.message,
        postId: postId,
        commentId: commentId,
        userId: createReplyDto.userId
      });
      throw error;
    }
  }

  @Post(':id/pin')
  async pinPost(@Param('id') postId: string, @Body() pinPostDto: PinPostDto) {
    console.log('📌 [INTERACTIONS] POST /posts/:id/pin - Pinning post', {
      postId: postId,
      userId: pinPostDto.userId,
      email: pinPostDto.email,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.pinPost(postId, pinPostDto.userId);
      console.log('✅ [INTERACTIONS] POST /posts/:id/pin - Post pinned successfully', {
        postId: postId,
        userId: pinPostDto.userId
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/pin - Failed to pin post', {
        error: error.message,
        postId: postId,
        userId: pinPostDto.userId
      });
      throw error;
    }
  }

  @Post(':id/save')
  async savePost(@Param('id') postId: string, @Body() savePostDto: SavePostDto) {
    console.log('💾 [INTERACTIONS] POST /posts/:id/save - Saving post', {
      postId: postId,
      userId: savePostDto.userId,
      email: savePostDto.email,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.interactionsService.savePost(postId, savePostDto.userId);
      console.log('✅ [INTERACTIONS] POST /posts/:id/save - Post saved successfully', {
        postId: postId,
        userId: savePostDto.userId
      });
      return result;
    } catch (error) {
      console.error('❌ [INTERACTIONS] POST /posts/:id/save - Failed to save post', {
        error: error.message,
        postId: postId,
        userId: savePostDto.userId
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
      return { data: comments };
    } catch (error) {
      console.error('❌ [INTERACTIONS] GET /posts/:id/comments - Failed to retrieve comments', {
        error: error.message,
        postId: postId
      });
      throw error;
    }
  }
}