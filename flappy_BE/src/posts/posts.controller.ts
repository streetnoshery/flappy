import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  UseGuards,
  Request
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    console.log('📝 [POSTS] POST /posts - Creating new post', {
      userId: req.user._id,
      postType: createPostDto.type,
      contentLength: createPostDto.content?.length,
      hasMedia: !!createPostDto.mediaUrl,
      timestamp: new Date().toISOString()
    });
    
    try {
      const post = await this.postsService.create(createPostDto, req.user._id);
      console.log('✅ [POSTS] POST /posts - Post created successfully', {
        postId: post._id,
        userId: req.user._id,
        postType: post.type,
        hashtagsCount: post.hashtags?.length || 0
      });
      return post;
    } catch (error) {
      console.error('❌ [POSTS] POST /posts - Failed to create post', {
        error: error.message,
        userId: req.user._id,
        postType: createPostDto.type
      });
      throw error;
    }
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    console.log('📖 [POSTS] GET /posts/:id - Fetching post', {
      postId: id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const post = await this.postsService.findById(id);
      console.log('✅ [POSTS] GET /posts/:id - Post retrieved', {
        postId: id,
        userId: post.userId,
        postType: post.type
      });
      return post;
    } catch (error) {
      console.error('❌ [POSTS] GET /posts/:id - Failed to retrieve post', {
        error: error.message,
        postId: id
      });
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @Request() req: any) {
    console.log('✏️ [POSTS] PUT /posts/:id - Updating post', {
      postId: id,
      userId: req.user._id,
      updateFields: Object.keys(updatePostDto),
      timestamp: new Date().toISOString()
    });
    
    try {
      const post = await this.postsService.update(id, updatePostDto, req.user._id);
      console.log('✅ [POSTS] PUT /posts/:id - Post updated successfully', {
        postId: id,
        userId: req.user._id,
        updatedFields: Object.keys(updatePostDto)
      });
      return post;
    } catch (error) {
      console.error('❌ [POSTS] PUT /posts/:id - Failed to update post', {
        error: error.message,
        postId: id,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: string, @Request() req: any) {
    console.log('🗑️ [POSTS] DELETE /posts/:id - Deleting post', {
      postId: id,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.postsService.delete(id, req.user._id);
      console.log('✅ [POSTS] DELETE /posts/:id - Post deleted successfully', {
        postId: id,
        userId: req.user._id
      });
      return result;
    } catch (error) {
      console.error('❌ [POSTS] DELETE /posts/:id - Failed to delete post', {
        error: error.message,
        postId: id,
        userId: req.user._id
      });
      throw error;
    }
  }

  @Get('trending-tags')
  async getTrendingTags() {
    console.log('📈 [POSTS] GET /posts/trending-tags - Fetching trending tags', {
      timestamp: new Date().toISOString()
    });
    
    try {
      const tags = await this.postsService.getTrendingTags();
      console.log('✅ [POSTS] GET /posts/trending-tags - Trending tags retrieved', {
        tagsCount: tags.length,
        topTag: tags[0]?.tag
      });
      return tags;
    } catch (error) {
      console.error('❌ [POSTS] GET /posts/trending-tags - Failed to retrieve trending tags', {
        error: error.message
      });
      throw error;
    }
  }
}