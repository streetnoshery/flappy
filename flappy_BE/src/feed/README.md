# Feed Module

## Overview
The Feed module provides comprehensive social media feed functionality, aggregating posts from all users with engagement metrics, user information, bookmark status, and pagination support. It includes optimized performance features to minimize database queries and provide real-time engagement data.

## Architecture
- **Controller**: `feed.controller.ts` - HTTP request handlers for feed endpoints
- **Service**: `feed.service.ts` - Business logic for feed generation and aggregation
- **Module**: `feed.module.ts` - NestJS module configuration with all required dependencies

## Features
- **Multiple Feed Types**: Home, Explore, and Reels feeds
- **Post Aggregation**: Complete post data with user information
- **Engagement Metrics**: Likes, comments, reactions, and bookmark status
- **Performance Optimization**: Bulk loading of all engagement data
- **Chronological Ordering**: Posts sorted by newest first
- **User Data Population**: Complete user profiles with photos
- **Pagination Support**: Efficient pagination with hasMore indicators
- **Bookmark Integration**: Real-time bookmark status for all posts

## API Endpoints

### GET /feed/home
Get the main home feed with all posts and engagement data.

**Query Parameters:**
- `page` - Page number (optional, default: 1)
- `userId` - User ID for personalized data (optional, UUID format)

**Response:**
```json
{
  "posts": [
    {
      "_id": "mongodb-object-id",
      "userId": {
        "_id": "mongodb-object-id",
        "userId": "uuid-string",
        "username": "string",
        "profilePhotoUrl": "string"
      },
      "email": "string",
      "type": "text|image|gif",
      "content": "string",
      "mediaUrl": "string",
      "hashtags": ["string"],
      "reactions": {
        "love": 5,
        "laugh": 2,
        "wow": 1
      },
      "userReaction": "love",
      "commentCount": 8,
      "likeCount": 8,
      "isLiked": true,
      "isBookmarked": false,
      "createdAt": "ISO-date",
      "updatedAt": "ISO-date"
    }
  ],
  "page": 1,
  "hasMore": true
}
```

### GET /feed/explore
Get the explore feed with engagement-based ranking.

**Query Parameters:**
- `page` - Page number (optional, default: 1)
- `userId` - User ID for personalized data (optional, UUID format)

**Response:** Same structure as home feed with engagement-based ordering

### GET /feed/reels
Get the reels feed with visual content only (images/GIFs).

**Query Parameters:**
- `page` - Page number (optional, default: 1)
- `userId` - User ID for personalized data (optional, UUID format)

**Response:** Same structure as home feed, filtered for visual content
```

## Feed Algorithm

### Post Ordering
- **Primary Sort**: Creation date (newest first)
- **Secondary Sort**: MongoDB ObjectId (for consistency)

### Data Aggregation
The feed service performs complex aggregation to include:

1. **User Information Population**
   - Username for display
   - Profile photo URL
   - User UUID for identification

2. **Engagement Metrics**
   - Like count from reactions collection
   - Comment count from interactions collection
   - Bookmark status (if applicable)

3. **Content Processing**
   - Full post content and metadata
   - Media URLs for image/GIF posts
   - Hashtag arrays for discovery

## Database Aggregation Pipeline

### Main Feed Query
```typescript
[
  // Lookup user information
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'userId'
    }
  },
  
  // Lookup like counts
  {
    $lookup: {
      from: 'reactions',
      let: { postId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
        { $count: 'count' }
      ],
      as: 'likeData'
    }
  },
  
  // Lookup comment counts
  {
    $lookup: {
      from: 'comments',
      let: { postId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
        { $count: 'count' }
      ],
      as: 'commentData'
    }
  },
  
  // Sort by creation date (newest first)
  { $sort: { createdAt: -1 } }
]
```

## Performance Optimizations

### Indexing Strategy
- `createdAt` field indexed for efficient sorting
- `userId` field indexed for user lookups
- Compound indexes for aggregation performance

### Pagination
- Offset-based pagination for consistent results
- Configurable limit with reasonable defaults
- Efficient skip/limit operations

### Data Projection
- Only necessary fields returned
- User password excluded from responses
- Optimized field selection for performance

## Integration Points

### With Posts Module
- Retrieves all posts for feed display
- Includes post metadata and content
- Respects post type feature flags

### With Users Module
- Populates user information for each post
- Includes username and profile photos
- Maintains user privacy settings

### With Reactions Module
- Calculates like counts per post
- Aggregates engagement metrics
- Provides real-time like data

### With Interactions Module
- Calculates comment counts per post
- Includes bookmark status
- Aggregates social interactions

## Error Handling
- **500 Internal Server Error**: Database aggregation failures
- **400 Bad Request**: Invalid pagination parameters
- Graceful degradation for missing data

## Usage Examples

### Get Home Feed
```typescript
// GET /feed
const homeFeed = await feedService.getHomeFeed();
```

### Get Paginated Feed
```typescript
// GET /feed?limit=10&offset=20
const paginatedFeed = await feedService.getHomeFeed(10, 20);
```

## Response Data Structure

### Post with Engagement
```typescript
{
  _id: ObjectId,
  userId: {
    _id: ObjectId,
    userId: string,      // UUID
    username: string,
    profilePhotoUrl?: string
  },
  email: string,
  type: 'text' | 'image' | 'gif',
  content: string,
  mediaUrl?: string,
  hashtags: string[],
  createdAt: Date,
  updatedAt: Date,
  likeCount: number,
  commentCount: number,
  isBookmarked: boolean
}
```

## Dependencies
- `mongoose` - MongoDB ODM and aggregation
- Posts, Users, Reactions, Interactions modules

## Performance Considerations
- Aggregation pipeline optimized for large datasets
- Indexes on frequently queried fields
- Pagination prevents memory issues
- Efficient data projection reduces bandwidth

## Future Enhancements
- Algorithm-based feed ranking
- User preference filtering
- Content recommendation system
- Real-time feed updates
- Advanced pagination (cursor-based)

## Notes
- Feed is currently chronological (newest first)
- All posts are included regardless of user relationships
- Engagement metrics are calculated in real-time
- User information is populated for display purposes
- Pagination supports large datasets efficiently

## Performance Optimizations

### Bookmark Status Integration
- **Bulk Loading**: Bookmark status loaded with feed data in single query
- **Conditional Loading**: Only checks bookmark status for other users' posts
- **Eliminates N+1 Queries**: Prevents separate API calls for each post's bookmark status
- **Real-time Updates**: Bookmark status reflects current state without caching issues

### Database Efficiency
- **Aggregation Pipelines**: Uses MongoDB aggregation for efficient data processing
- **Selective Population**: Only populates necessary user fields to minimize data transfer
- **Indexed Queries**: Optimized queries with proper database indexing
- **Pagination**: Efficient skip/limit pagination with hasMore indicators

### Memory Management
- **Lean Queries**: Uses .lean() for better performance and reduced memory usage
- **Batch Processing**: Processes posts in batches to manage memory consumption
- **Efficient Mapping**: Minimizes object creation and transformation overhead

## Business Logic

### Feed Generation Rules
1. **Chronological Order**: All feeds sorted by creation date (newest first)
2. **User Data Population**: Complete user profiles included for all posts
3. **Engagement Calculation**: Real-time like counts, comment counts, and reaction data
4. **Bookmark Status**: Shows bookmark status only for other users' posts
5. **Content Filtering**: Reels feed filters for image/GIF content only

### Personalization Features
- **User-specific Data**: When userId provided, includes personalized engagement data
- **Reaction Status**: Shows user's specific reaction to each post
- **Bookmark Status**: Shows whether user has bookmarked each post
- **Like Status**: Indicates if user has liked (reacted with love) to posts

## Integration Points

### With Interactions Module
- Calculates comment counts per post
- Includes bookmark status for performance optimization
- Provides real-time engagement data

### With Reactions Module
- Aggregates reaction counts by type
- Includes user-specific reaction status
- Calculates total like counts for backward compatibility

### With Posts Module
- Retrieves core post data and metadata
- Validates post existence and accessibility
- Includes post type filtering for specialized feeds

### With Users Module
- Populates complete user profile data
- Validates user permissions and access
- Provides user-specific personalization data

## Dependencies
- `mongoose` - MongoDB ODM and aggregation pipelines
- Posts, Users, Reactions, Interactions modules for data relationships
- Bookmark, Comment, Reaction schemas for engagement metrics

## Performance Considerations
- **Database Indexes**: Ensure proper indexing on createdAt, userId, postId fields
- **Query Optimization**: Use aggregation pipelines for complex data processing
- **Memory Usage**: Monitor memory consumption with large datasets
- **Response Time**: Optimize for sub-200ms response times on typical loads

## Error Handling
- **Graceful Degradation**: Continues operation even if some engagement data fails
- **Fallback Values**: Provides default values for missing engagement metrics
- **Error Logging**: Comprehensive logging for debugging and monitoring
- **User Experience**: Maintains feed functionality even with partial data failures

## Future Enhancements
- **Algorithmic Ranking**: Implement engagement-based feed ranking for explore
- **Real-time Updates**: WebSocket integration for live feed updates
- **Content Filtering**: Advanced filtering based on user preferences
- **Caching Layer**: Redis caching for frequently accessed feed data
- **Analytics Integration**: Track feed engagement and user behavior metrics

## Console Logging
- 🏠 Home feed requests with pagination and user context
- 🔍 Explore feed requests with engagement tracking
- 🎬 Reels feed requests with content type filtering
- ✅ Successful feed generation with performance metrics
- ❌ Feed generation errors with detailed context