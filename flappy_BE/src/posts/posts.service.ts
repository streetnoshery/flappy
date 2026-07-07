import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(createPostDto: CreatePostDto, actorId: string) {
    const hashtags = this.extractHashtags(createPostDto.content);
    const post = new this.postModel({
      userId: actorId,          // always from JWT, never from DTO
      type: createPostDto.type,
      content: createPostDto.content,
      mediaUrl: createPostDto.mediaUrl,
      hashtags,
    });
    return post.save();
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

  async update(id: string, updatePostDto: UpdatePostDto, actorId: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    // Ownership verified against JWT actorId — not a client-supplied value
    if (post.userId !== actorId) {
      throw new NotFoundException('Post not found'); // 404 avoids leaking existence
    }

    const hashtags = updatePostDto.content
      ? this.extractHashtags(updatePostDto.content)
      : post.hashtags;

    const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      { content: updatePostDto.content, mediaUrl: updatePostDto.mediaUrl, hashtags },
      { new: true },
    ).lean();

    const user = await this.userModel
      .findOne({ userId: updatedPost.userId }, 'username profilePhotoUrl userId _id')
      .lean();

    return {
      ...updatedPost,
      userId: user ?? { userId: updatedPost.userId, username: 'Unknown User', profilePhotoUrl: null },
    };
  }

  async delete(id: string, actorId: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    // Look up actor to check if admin — role comes from DB, never from the client
    const actor = await this.userModel.findOne({ userId: actorId });
    if (!actor) throw new NotFoundException('Post not found'); // don't reveal user-not-found

    const isAdmin = actor.role === 'admin';
    const isOwner = post.userId === actorId;

    if (!isAdmin && !isOwner) {
      // Return 404 — avoids confirming the post exists to non-owners
      throw new NotFoundException('Post not found');
    }

    await this.postModel.findByIdAndDelete(id);
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

  async findByUserId(userId: string, currentUserId?: string) {
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
        
        // Get current user's reaction if provided
        let userReaction = null;
        if (currentUserId) {
          const userReactionDoc = await this.reactionModel.findOne({ 
            postId: post._id.toString(), 
            userId: currentUserId 
          }).lean();
          userReaction = userReactionDoc ? userReactionDoc.type : null;
        }
        
        // Get comment count
        const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
        
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction,
          commentCount,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: userReaction === 'love' // Heart is filled if user reacted with love
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