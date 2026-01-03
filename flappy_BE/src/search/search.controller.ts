import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  async searchUsers(@Query('q') query: string) {
    console.log('🔍 [SEARCH] GET /search/users - Searching users', {
      searchQuery: query,
      timestamp: new Date().toISOString()
    });
    
    try {
      const users = await this.searchService.searchUsers(query);
      console.log('✅ [SEARCH] GET /search/users - User search completed', {
        searchQuery: query,
        resultsCount: users.length
      });
      return users;
    } catch (error) {
      console.error('❌ [SEARCH] GET /search/users - User search failed', {
        error: error.message,
        searchQuery: query
      });
      throw error;
    }
  }

  @Get('posts')
  async searchPosts(@Query('q') query: string) {
    console.log('🔍 [SEARCH] GET /search/posts - Searching posts', {
      searchQuery: query,
      timestamp: new Date().toISOString()
    });
    
    try {
      const posts = await this.searchService.searchPosts(query);
      console.log('✅ [SEARCH] GET /search/posts - Post search completed', {
        searchQuery: query,
        resultsCount: posts.length
      });
      return posts;
    } catch (error) {
      console.error('❌ [SEARCH] GET /search/posts - Post search failed', {
        error: error.message,
        searchQuery: query
      });
      throw error;
    }
  }

  @Get('trending-tags')
  async getTrendingTags() {
    console.log('📈 [SEARCH] GET /search/trending-tags - Fetching trending tags', {
      timestamp: new Date().toISOString()
    });
    
    try {
      const tags = await this.searchService.getTrendingTags();
      console.log('✅ [SEARCH] GET /search/trending-tags - Trending tags retrieved', {
        tagsCount: tags.length,
        topTag: tags[0]?.tag
      });
      return tags;
    } catch (error) {
      console.error('❌ [SEARCH] GET /search/trending-tags - Failed to retrieve trending tags', {
        error: error.message
      });
      throw error;
    }
  }
}