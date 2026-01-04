import { Controller, Get, Query } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('home')
  async getHomeFeed(@Query('page') page: number = 1, @Query('userId') userId?: string) {
    console.log('🏠 [FEED] GET /feed/home - Fetching home feed', {
      page: page,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const feed = await this.feedService.getHomeFeed(page, userId);
      console.log('✅ [FEED] GET /feed/home - Home feed retrieved', {
        page: feed.page,
        postsCount: feed.posts.length,
        hasMore: feed.hasMore
      });
      return feed;
    } catch (error) {
      console.error('❌ [FEED] GET /feed/home - Failed to retrieve home feed', {
        error: error.message,
        page: page
      });
      throw error;
    }
  }

  @Get('reels')
  async getReelsFeed(@Query('page') page: number = 1, @Query('userId') userId?: string) {
    console.log('🎬 [FEED] GET /feed/reels - Fetching reels feed', {
      page: page,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const feed = await this.feedService.getReelsFeed(page, userId);
      console.log('✅ [FEED] GET /feed/reels - Reels feed retrieved', {
        page: feed.page,
        postsCount: feed.posts.length,
        hasMore: feed.hasMore
      });
      return feed;
    } catch (error) {
      console.error('❌ [FEED] GET /feed/reels - Failed to retrieve reels feed', {
        error: error.message,
        page: page
      });
      throw error;
    }
  }

  @Get('explore')
  async getExploreFeed(@Query('page') page: number = 1, @Query('userId') userId?: string) {
    console.log('🔍 [FEED] GET /feed/explore - Fetching explore feed', {
      page: page,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const feed = await this.feedService.getExploreFeed(page, userId);
      console.log('✅ [FEED] GET /feed/explore - Explore feed retrieved', {
        page: feed.page,
        postsCount: feed.posts.length,
        hasMore: feed.hasMore
      });
      return feed;
    } catch (error) {
      console.error('❌ [FEED] GET /feed/explore - Failed to retrieve explore feed', {
        error: error.message,
        page: page
      });
      throw error;
    }
  }
}