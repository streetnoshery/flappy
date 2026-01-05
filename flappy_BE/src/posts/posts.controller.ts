import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  BadRequestException
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { FeatureFlagsService } from '../common/services/feature-flags.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  @Post()
  async createPost(@Body() createPostDto: CreatePostDto) {
    console.log('📝 [POSTS] POST /posts - Creating new post', {
      userId: createPostDto.userId,
      userEmail: createPostDto.email,
      postType: createPostDto.type,
      contentLength: createPostDto.content?.length,
      hasMedia: !!createPostDto.mediaUrl,
      timestamp: new Date().toISOString()
    });
    
    // Additional feature flag validation
    if (!this.featureFlagsService.validatePostType(createPostDto.type)) {
      const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
      console.error('❌ [POSTS] POST /posts - Post type not enabled', {
        requestedType: createPostDto.type,
        enabledTypes,
        userId: createPostDto.userId
      });
      throw new BadRequestException(`Post type '${createPostDto.type}' is not enabled. Available types: ${enabledTypes.join(', ')}`);
    }
    
    try {
      const post = await this.postsService.create(createPostDto);
      console.log('✅ [POSTS] POST /posts - Post created successfully', {
        postId: post._id,
        userId: createPostDto.userId,
        postType: post.type,
        hashtagsCount: post.hashtags?.length || 0
      });
      return post;
    } catch (error) {
      console.error('❌ [POSTS] POST /posts - Failed to create post', {
        error: error.message,
        userId: createPostDto.userId,
        postType: createPostDto.type
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

  @Get('user/:userId')
  async getPostsByUserId(@Param('userId') userId: string) {
    console.log('👤 [POSTS] GET /posts/user/:userId - Fetching posts by user', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const posts = await this.postsService.findByUserId(userId);
      console.log('✅ [POSTS] GET /posts/user/:userId - User posts retrieved', {
        userId,
        postsCount: posts.length
      });
      return { data: posts };
    } catch (error) {
      console.error('❌ [POSTS] GET /posts/user/:userId - Failed to retrieve user posts', {
        error: error.message,
        userId
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
  async updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    console.log('✏️ [POSTS] PUT /posts/:id - Updating post', {
      postId: id,
      userId: updatePostDto.userId,
      updateFields: Object.keys(updatePostDto),
      timestamp: new Date().toISOString()
    });
    
    try {
      const post = await this.postsService.update(id, updatePostDto);
      console.log('✅ [POSTS] PUT /posts/:id - Post updated successfully', {
        postId: id,
        userId: updatePostDto.userId,
        updatedFields: Object.keys(updatePostDto)
      });
      return post;
    } catch (error) {
      console.error('❌ [POSTS] PUT /posts/:id - Failed to update post', {
        error: error.message,
        postId: id,
        userId: updatePostDto.userId
      });
      throw error;
    }
  }

  @Delete(':id')
  async deletePost(@Param('id') id: string, @Body() body: { userId: string; email: string }) {
    console.log('🗑️ [POSTS] DELETE /posts/:id - Deleting post', {
      postId: id,
      userId: body.userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.postsService.delete(id, body.userId);
      console.log('✅ [POSTS] DELETE /posts/:id - Post deleted successfully', {
        postId: id,
        userId: body.userId
      });
      return result;
    } catch (error) {
      console.error('❌ [POSTS] DELETE /posts/:id - Failed to delete post', {
        error: error.message,
        postId: id,
        userId: body.userId
      });
      throw error;
    }
  }
}