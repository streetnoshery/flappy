import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Like } from '../interactions/schemas/like.schema';
import { Comment } from '../interactions/schemas/comment.schema';
import { Bookmark } from '../interactions/schemas/bookmark.schema';
import { Reaction } from '../reactions/schemas/reaction.schema';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Bookmark.name) private bookmarkModel: Model<Bookmark>,
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>
  ) {}

  async getHomeFeed(page: number = 1, userId?: string) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🏠 [FEED_SERVICE] Fetching home feed', {
      page,
      limit,
      skip,
      userId
    });
    
    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Manually populate user data and reaction information
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
        
        // Get user's reaction if userId provided
        let userReaction = null;
        if (userId) {
          const userReactionDoc = await this.reactionModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          userReaction = userReactionDoc ? userReactionDoc.type : null;
        }
        
        // Get comment count
        const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
        
        // Get bookmark status if userId provided (only for other users' posts)
        let isBookmarked = false;
        if (userId && post.userId !== userId) {
          const bookmark = await this.bookmarkModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          isBookmarked = !!bookmark;
        }
        
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction,
          commentCount,
          isBookmarked,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: userReaction === 'love' // Heart is filled if user reacted with love
        };
      })
    );
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Home feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      oldestPostDate: posts[posts.length - 1]?.createdAt,
      newestPostDate: posts[0]?.createdAt
    });
    
    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }

  async getReelsFeed(page: number = 1, userId?: string) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🎬 [FEED_SERVICE] Fetching reels feed', {
      page,
      limit,
      skip,
      filterTypes: ['gif', 'image'],
      userId
    });
    
    const posts = await this.postModel
      .find({ type: { $in: ['gif', 'image'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Manually populate user data and reaction information
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId').lean();
        
        // Get reaction information
        const reactionCounts = await this.reactionModel.aggregate([
          { $match: { postId: post._id.toString() } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);
        
        const reactions = reactionCounts.reduce((acc, reaction) => {
          acc[reaction._id] = reaction.count;
          return acc;
        }, {});
        
        // Get user's reaction if userId provided
        let userReaction = null;
        if (userId) {
          const userReactionDoc = await this.reactionModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          userReaction = userReactionDoc ? userReactionDoc.type : null;
        }
        
        // Get comment count
        const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
        
        // Get bookmark status if userId provided (only for other users' posts)
        let isBookmarked = false;
        if (userId && post.userId !== userId) {
          const bookmark = await this.bookmarkModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          isBookmarked = !!bookmark;
        }
        
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction,
          commentCount,
          isBookmarked,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: userReaction === 'love' // Heart is filled if user reacted with love
        };
      })
    );
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Reels feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      postTypes: posts.map(p => p.type)
    });
    
    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }

  async getExploreFeed(page: number = 1, userId?: string) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🔍 [FEED_SERVICE] Fetching explore feed (engagement-based ranking to be implemented)', {
      page,
      limit,
      skip,
      note: 'Currently using chronological sorting',
      userId
    });
    
    // Mock engagement calculation - implement actual engagement logic
    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Manually populate user data and reaction information
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId').lean();
        
        // Get reaction information
        const reactionCounts = await this.reactionModel.aggregate([
          { $match: { postId: post._id.toString() } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);
        
        const reactions = reactionCounts.reduce((acc, reaction) => {
          acc[reaction._id] = reaction.count;
          return acc;
        }, {});
        
        // Get user's reaction if userId provided
        let userReaction = null;
        if (userId) {
          const userReactionDoc = await this.reactionModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          userReaction = userReactionDoc ? userReactionDoc.type : null;
        }
        
        // Get comment count
        const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
        
        // Get bookmark status if userId provided (only for other users' posts)
        let isBookmarked = false;
        if (userId && post.userId !== userId) {
          const bookmark = await this.bookmarkModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          isBookmarked = !!bookmark;
        }
        
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction,
          commentCount,
          isBookmarked,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: userReaction === 'love' // Heart is filled if user reacted with love
        };
      })
    );
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Explore feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      engagementLogic: 'MOCK - using chronological order'
    });
    
    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }
}