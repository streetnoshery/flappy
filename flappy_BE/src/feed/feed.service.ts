import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Like } from '../interactions/schemas/like.schema';
import { Comment } from '../interactions/schemas/comment.schema';
import { Bookmark } from '../interactions/schemas/bookmark.schema';
import { Reaction } from '../reactions/schemas/reaction.schema';
import { FollowCacheService } from '../follow/follow-cache.service';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Bookmark.name) private bookmarkModel: Model<Bookmark>,
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    private readonly followCacheService: FollowCacheService,
  ) {}

  /**
   * Shared enrichment helper that adds author info, reaction counts, user reaction,
   * comment count, bookmark status, canDelete, likeCount, and isLiked to each post.
   */
  private async enrichPosts(
    posts: any[],
    userId?: string,
    currentUserRole?: string,
  ) {
    return Promise.all(
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
            userId,
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
            userId,
          }).lean();
          isBookmarked = !!bookmark;
        }

        // Determine if current user can delete this post
        const canDelete = userId && (currentUserRole === 'admin' || post.userId === userId);

        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
          reactions,
          userReaction,
          commentCount,
          isBookmarked,
          canDelete,
          // Keep like count for backward compatibility (sum of all reactions)
          likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
          isLiked: userReaction === 'love', // Heart is filled if user reacted with love
        };
      }),
    );
  }

  async getHomeFeed(page: number = 1, userId?: string) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🏠 [FEED_SERVICE] Fetching home feed', {
      page,
      limit,
      skip,
      userId
    });
    
    // Get current user's role if userId provided
    let currentUserRole = null;
    if (userId) {
      const currentUser = await this.userModel.findOne({ userId }, 'role').lean();
      currentUserRole = currentUser?.role || 'user';
    }
    
    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const postsWithUsers = await this.enrichPosts(posts, userId, currentUserRole);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Home feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      currentUserRole,
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
    
    // Get current user's role if userId provided
    let currentUserRole = null;
    if (userId) {
      const currentUser = await this.userModel.findOne({ userId }, 'role').lean();
      currentUserRole = currentUser?.role || 'user';
    }
    
    const posts = await this.postModel
      .find({ type: { $in: ['gif', 'image'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const postsWithUsers = await this.enrichPosts(posts, userId, currentUserRole);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Reels feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      currentUserRole,
      postTypes: posts.map(p => p.type)
    });
    
    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }

  async getFollowingFeed(page: number = 1, userId: string) {
    const limit = 10;
    const skip = (page - 1) * limit;

    console.log('👥 [FEED_SERVICE] Fetching following feed', {
      page,
      limit,
      skip,
      userId,
    });

    // Get the list of user IDs that this user follows
    const followingIds = this.followCacheService.getFollowingIds(userId);

    // If the user follows nobody, return empty result immediately
    if (followingIds.length === 0) {
      console.log('👥 [FEED_SERVICE] User follows nobody, returning empty feed', { userId });
      return { posts: [], page, hasMore: false };
    }

    // Get current user's role for canDelete flag
    let currentUserRole = null;
    const currentUser = await this.userModel.findOne({ userId }, 'role').lean();
    currentUserRole = currentUser?.role || 'user';

    const posts = await this.postModel
      .find({ userId: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const postsWithUsers = await this.enrichPosts(posts, userId, currentUserRole);

    const hasMore = posts.length === limit;

    console.log('✅ [FEED_SERVICE] Following feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      followingCount: followingIds.length,
    });

    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }

  async getTrendingFeed(page: number = 1, userId?: string) {
    const limit = 10;
    const skip = (page - 1) * limit;
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    console.log('🔥 [FEED_SERVICE] Fetching trending feed', {
      page,
      limit,
      skip,
      cutoffDate: cutoffDate.toISOString(),
      userId,
    });

    // Get current user's role if userId provided
    let currentUserRole = null;
    if (userId) {
      const currentUser = await this.userModel.findOne({ userId }, 'role').lean();
      currentUserRole = currentUser?.role || 'user';
    }

    const pipeline: any[] = [
      // 1. Filter posts within the 7-day window
      { $match: { createdAt: { $gte: cutoffDate } } },
      // 2. Lookup reactions by converting _id to string for the join
      {
        $lookup: {
          from: 'reactions',
          let: { postId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
          ],
          as: 'reactionsLookup',
        },
      },
      // 3. Lookup comments by converting _id to string for the join
      {
        $lookup: {
          from: 'comments',
          let: { postId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
          ],
          as: 'commentsLookup',
        },
      },
      // 4. Compute engagement score
      {
        $addFields: {
          reactionCount: { $size: '$reactionsLookup' },
          commentCount: { $size: '$commentsLookup' },
          engagementScore: {
            $add: [
              { $size: '$reactionsLookup' },
              { $size: '$commentsLookup' },
            ],
          },
        },
      },
      // 5. Sort by engagement score desc, then createdAt desc as tiebreaker
      { $sort: { engagementScore: -1, createdAt: -1 } },
      // 6. Pagination
      { $skip: skip },
      { $limit: limit },
      // 7. Remove the lookup arrays to keep the response clean
      {
        $project: {
          reactionsLookup: 0,
          commentsLookup: 0,
          reactionCount: 0,
          commentCount: 0,
          engagementScore: 0,
        },
      },
    ];

    const aggregatedPosts = await this.postModel.aggregate(pipeline);

    // Convert aggregation results to the format expected by enrichPosts
    // Aggregation returns plain objects with _id as ObjectId; enrichPosts expects _id with toString()
    const posts = aggregatedPosts.map((post) => ({
      ...post,
      _id: post._id,
    }));

    const postsWithUsers = await this.enrichPosts(posts, userId, currentUserRole);

    const hasMore = posts.length === limit;

    console.log('✅ [FEED_SERVICE] Trending feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      currentUserRole,
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
    
    // Get current user's role if userId provided
    let currentUserRole = null;
    if (userId) {
      const currentUser = await this.userModel.findOne({ userId }, 'role').lean();
      currentUserRole = currentUser?.role || 'user';
    }
    
    // Mock engagement calculation - implement actual engagement logic
    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const postsWithUsers = await this.enrichPosts(posts, userId, currentUserRole);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Explore feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      currentUserRole,
      engagementLogic: 'MOCK - using chronological order'
    });
    
    return {
      posts: postsWithUsers,
      page,
      hasMore,
    };
  }
}