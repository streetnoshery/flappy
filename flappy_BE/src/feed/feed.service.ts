import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class FeedService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async getHomeFeed(page: number = 1) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🏠 [FEED_SERVICE] Fetching home feed', {
      page,
      limit,
      skip
    });
    
    const posts = await this.postModel
      .find()
      .populate('userId', 'username profilePhotoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Home feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      oldestPostDate: posts[posts.length - 1]?.createdAt,
      newestPostDate: posts[0]?.createdAt
    });
    
    return {
      posts,
      page,
      hasMore,
    };
  }

  async getReelsFeed(page: number = 1) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🎬 [FEED_SERVICE] Fetching reels feed', {
      page,
      limit,
      skip,
      filterTypes: ['gif', 'image']
    });
    
    const posts = await this.postModel
      .find({ type: { $in: ['gif', 'image'] } })
      .populate('userId', 'username profilePhotoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Reels feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      postTypes: posts.map(p => p.type)
    });
    
    return {
      posts,
      page,
      hasMore,
    };
  }

  async getExploreFeed(page: number = 1) {
    const limit = 10;
    const skip = (page - 1) * limit;
    
    console.log('🔍 [FEED_SERVICE] Fetching explore feed (engagement-based ranking to be implemented)', {
      page,
      limit,
      skip,
      note: 'Currently using chronological sorting'
    });
    
    // Mock engagement calculation - implement actual engagement logic
    const posts = await this.postModel
      .find()
      .populate('userId', 'username profilePhotoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const hasMore = posts.length === limit;
    
    console.log('✅ [FEED_SERVICE] Explore feed retrieved', {
      page,
      postsReturned: posts.length,
      hasMore,
      engagementLogic: 'MOCK - using chronological order'
    });
    
    return {
      posts,
      page,
      hasMore,
    };
  }
}