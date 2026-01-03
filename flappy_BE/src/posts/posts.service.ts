import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post } from './schemas/post.schema';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<Post>) {}

  async create(createPostDto: CreatePostDto, userId: string) {
    console.log('📝 [POSTS_SERVICE] Creating new post', {
      userId,
      postType: createPostDto.type,
      contentLength: createPostDto.content?.length,
      hasMedia: !!createPostDto.mediaUrl
    });
    
    const hashtags = this.extractHashtags(createPostDto.content);
    console.log('🏷️ [POSTS_SERVICE] Extracted hashtags', {
      hashtags,
      hashtagCount: hashtags.length
    });
    
    const post = new this.postModel({
      ...createPostDto,
      userId,
      hashtags,
    });
    
    const savedPost = await post.save();
    console.log('✅ [POSTS_SERVICE] Post created successfully', {
      postId: savedPost._id,
      userId,
      hashtagsExtracted: hashtags.length
    });
    
    return savedPost;
  }

  async findById(id: string) {
    console.log('📖 [POSTS_SERVICE] Fetching post by ID', { postId: id });
    
    const post = await this.postModel.findById(id).populate('userId', 'username profilePhotoUrl');
    if (!post) {
      console.log('❌ [POSTS_SERVICE] Post not found', { postId: id });
      throw new NotFoundException('Post not found');
    }
    
    console.log('✅ [POSTS_SERVICE] Post retrieved successfully', {
      postId: id,
      authorId: post.userId,
      postType: post.type
    });
    
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string) {
    console.log('✏️ [POSTS_SERVICE] Updating post', {
      postId: id,
      userId,
      updateFields: Object.keys(updatePostDto)
    });
    
    const post = await this.postModel.findById(id);
    if (!post) {
      console.log('❌ [POSTS_SERVICE] Post not found for update', { postId: id });
      throw new NotFoundException('Post not found');
    }
    
    if (post.userId.toString() !== userId) {
      console.log('❌ [POSTS_SERVICE] Unauthorized post update attempt', {
        postId: id,
        postOwnerId: post.userId,
        requestUserId: userId
      });
      throw new ForbiddenException('You can only update your own posts');
    }
    
    const hashtags = updatePostDto.content ? this.extractHashtags(updatePostDto.content) : post.hashtags;
    console.log('🏷️ [POSTS_SERVICE] Updated hashtags', {
      oldHashtags: post.hashtags,
      newHashtags: hashtags
    });
    
    const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      { ...updatePostDto, hashtags },
      { new: true }
    ).populate('userId', 'username profilePhotoUrl');
    
    console.log('✅ [POSTS_SERVICE] Post updated successfully', {
      postId: id,
      userId,
      updatedFields: Object.keys(updatePostDto)
    });
    
    return updatedPost;
  }

  async delete(id: string, userId: string) {
    console.log('🗑️ [POSTS_SERVICE] Deleting post', {
      postId: id,
      userId
    });
    
    const post = await this.postModel.findById(id);
    if (!post) {
      console.log('❌ [POSTS_SERVICE] Post not found for deletion', { postId: id });
      throw new NotFoundException('Post not found');
    }
    
    if (post.userId.toString() !== userId) {
      console.log('❌ [POSTS_SERVICE] Unauthorized post deletion attempt', {
        postId: id,
        postOwnerId: post.userId,
        requestUserId: userId
      });
      throw new ForbiddenException('You can only delete your own posts');
    }
    
    await this.postModel.findByIdAndDelete(id);
    console.log('✅ [POSTS_SERVICE] Post deleted successfully', {
      postId: id,
      userId
    });
    
    return { message: 'Post deleted successfully' };
  }

  async getTrendingTags() {
    console.log('📈 [POSTS_SERVICE] Calculating trending tags');
    
    const result = await this.postModel.aggregate([
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const trendingTags = result.map(item => ({ tag: item._id, count: item.count }));
    console.log('✅ [POSTS_SERVICE] Trending tags calculated', {
      totalTags: trendingTags.length,
      topTag: trendingTags[0]?.tag,
      topTagCount: trendingTags[0]?.count
    });
    
    return trendingTags;
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex);
    const hashtags = matches ? matches.map(tag => tag.substring(1)) : [];
    
    console.log('🏷️ [POSTS_SERVICE] Hashtag extraction', {
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      extractedHashtags: hashtags
    });
    
    return hashtags;
  }
}