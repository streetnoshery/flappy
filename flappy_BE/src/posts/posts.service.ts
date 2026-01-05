import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post } from './schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Reaction } from '../reactions/schemas/reaction.schema';
import { Comment } from '../interactions/schemas/comment.schema';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>
  ) {}

  async create(createPostDto: CreatePostDto) {
    console.log('📝 [POSTS_SERVICE] Creating new post', {
      userId: createPostDto.userId,
      email: createPostDto.email,
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
      userId: createPostDto.userId,
      email: createPostDto.email,
      type: createPostDto.type,
      content: createPostDto.content,
      mediaUrl: createPostDto.mediaUrl,
      hashtags,
    });
    
    const savedPost = await post.save();
    console.log('✅ [POSTS_SERVICE] Post created successfully', {
      postId: savedPost._id,
      userId: createPostDto.userId,
      hashtagsExtracted: hashtags.length
    });
    
    return savedPost;
  }

  async findById(id: string) {
    console.log('📖 [POSTS_SERVICE] Fetching post by ID', { postId: id });
    
    const post = await this.postModel.findById(id).lean();
    if (!post) {
      console.log('❌ [POSTS_SERVICE] Post not found', { postId: id });
      throw new NotFoundException('Post not found');
    }
    
    // Manually populate user data
    const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId _id').lean();
    const postWithUser = {
      ...post,
      userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null }
    };
    
    console.log('✅ [POSTS_SERVICE] Post retrieved successfully', {
      postId: id,
      authorId: post.userId,
      postType: post.type
    });
    
    return postWithUser;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    console.log('✏️ [POSTS_SERVICE] Updating post', {
      postId: id,
      userId: updatePostDto.userId,
      updateFields: Object.keys(updatePostDto)
    });
    
    const post = await this.postModel.findById(id);
    if (!post) {
      console.log('❌ [POSTS_SERVICE] Post not found for update', { postId: id });
      throw new NotFoundException('Post not found');
    }
    
    if (post.userId !== updatePostDto.userId) {
      console.log('❌ [POSTS_SERVICE] Unauthorized post update attempt', {
        postId: id,
        postOwnerId: post.userId,
        requestUserId: updatePostDto.userId
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
      { 
        content: updatePostDto.content,
        mediaUrl: updatePostDto.mediaUrl,
        hashtags 
      },
      { new: true }
    ).lean();
    
    // Manually populate user data
    const user = await this.userModel.findOne({ userId: updatedPost.userId }, 'username profilePhotoUrl userId _id').lean();
    const postWithUser = {
      ...updatedPost,
      userId: user || { userId: updatedPost.userId, username: 'Unknown User', profilePhotoUrl: null }
    };
    
    console.log('✅ [POSTS_SERVICE] Post updated successfully', {
      postId: id,
      userId: updatePostDto.userId,
      updatedFields: Object.keys(updatePostDto)
    });
    
    return postWithUser;
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
    
    if (post.userId !== userId) {
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

  async findByUserId(userId: string) {
    const posts = await this.postModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Manually populate user data and reaction information for each post
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId _id').lean();
        
        // Get reaction information
        const reactionCounts = await this.reactionModel.aggregate([
          { $match: { postId: post._id.toString() } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);
        
        const reactions = reactionCounts.reduce((acc, reaction) => {
          acc[reaction._id] = reaction.count;
          return acc;
        }, {});
        
        // Get comment count
        const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
        
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction: null, // We don't need user reaction for profile view
          commentCount,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: false // Default to false for profile view
        };
      })
    );
    
    return postsWithUsers;
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