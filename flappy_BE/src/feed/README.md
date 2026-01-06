# Feed Module

## Overview
The Feed module provides the main social media feed functionality, aggregating posts from all users with engagement metrics, user information, and pagination support.

## Architecture
- **Controller**: `feed.controller.ts` - HTTP request handlers for feed endpoints
- **Service**: `feed.service.ts` - Business logic for feed generation and aggregation
- **Module**: `feed.module.ts` - NestJS module configuration

## Features
- Home feed with all posts
- Post aggregation with user information
- Engagement metrics (likes, comments, bookmarks)
- Chronological ordering (newest first)
- User data population
- Comment count calculation

## API Endpoints

### GET /feed
Get the main home feed with all posts and engagement data.

**Query Parameters:**
- `limit` - Number of posts to return (optional, default: 20)
- `offset` - Number of posts to skip (optional, default: 0)

**Response:**
```json
[
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
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date",
    "likeCount": "number",
    "commentCount": "number",
    "isBookmarked": "boolean"
  }
]
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