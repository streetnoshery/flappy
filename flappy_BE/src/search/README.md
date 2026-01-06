# Search Module

## Overview
The Search module provides comprehensive search functionality for users, posts, and trending content. It includes text-based search, user discovery, and trending hashtag analysis with feature flag integration.

## Architecture
- **Controller**: `search.controller.ts` - HTTP request handlers
- **Service**: `search.service.ts` - Business logic and search algorithms
- **Module**: `search.module.ts` - NestJS module configuration

## Features
- User search by username and email
- Post search by content and hashtags
- Trending hashtag analysis
- Text-based fuzzy search
- Feature flag integration (`ENABLE_ADVANCED_SEARCH`)

## API Endpoints

### GET /search/users
Search for users by username or email.

**Query Parameters:**
- `q` - Search query string (required)
- `limit` - Number of results to return (optional, default: 10)

**Response:**
```json
[
  {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "username": "string",
    "email": "string",
    "bio": "string",
    "profilePhotoUrl": "string",
    "createdAt": "ISO-date"
  }
]
```

### GET /search/posts
Search for posts by content and hashtags.

**Query Parameters:**
- `q` - Search query string (required)
- `limit` - Number of results to return (optional, default: 10)

**Response:**
```json
[
  {
    "_id": "mongodb-object-id",
    "userId": {
      "_id": "mongodb-object-id",
      "userId": "uuid-string",
      "username": "string"
    },
    "email": "string",
    "type": "text|image|gif",
    "content": "string",
    "mediaUrl": "string",
    "hashtags": ["string"],
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date"
  }
]
```

### GET /search/trending-tags
Get trending hashtags based on usage frequency.

**Query Parameters:**
- `limit` - Number of trending tags to return (optional, default: 10)

**Response:**
```json
[
  {
    "tag": "string",
    "count": "number"
  }
]
```

## Feature Flag Integration
The search module respects the `ENABLE_ADVANCED_SEARCH` feature flag:

```typescript
// Feature flag check in controller
if (!featureFlagsService.isFeatureEnabled('enableAdvancedSearch')) {
  throw new BadRequestException('Advanced search is currently disabled');
}
```

When `ENABLE_ADVANCED_SEARCH=false`:
- All search endpoints return 400 Bad Request
- Frontend shows "Search Coming Soon" message
- Search UI is hidden from navigation

## Search Algorithms

### User Search
- **Username Matching**: Case-insensitive partial matching
- **Email Matching**: Case-insensitive partial matching
- **Fuzzy Search**: Supports typos and partial matches
- **Relevance Scoring**: Username matches prioritized over email

```typescript
// MongoDB query for user search
{
  $or: [
    { username: { $regex: query, $options: 'i' } },
    { email: { $regex: query, $options: 'i' } }
  ]
}
```

### Post Search
- **Content Search**: Full-text search in post content
- **Hashtag Search**: Exact and partial hashtag matching
- **Multi-field Search**: Searches both content and hashtags
- **Chronological Order**: Recent posts prioritized

```typescript
// MongoDB query for post search
{
  $or: [
    { content: { $regex: query, $options: 'i' } },
    { hashtags: { $in: [new RegExp(query, 'i')] } }
  ]
}
```

### Trending Analysis
- **Hashtag Frequency**: Counts hashtag usage across all posts
- **Time-based Trending**: Recent usage weighted higher
- **Aggregation Pipeline**: Efficient counting and sorting
- **Real-time Updates**: Reflects current hashtag popularity

```typescript
// Aggregation pipeline for trending tags
[
  { $unwind: '$hashtags' },
  { $group: { _id: '$hashtags', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: limit }
]
```

## Performance Optimizations

### Indexing Strategy
- Text indexes on searchable fields
- Compound indexes for multi-field queries
- Hashtag array indexing for efficient matching
- Username and email indexes for user search

### Query Optimization
- Limit results to prevent large responses
- Efficient regex patterns for text matching
- Aggregation pipelines for complex queries
- Projection to return only necessary fields

### Caching Strategy
- Trending tags cached for performance
- Search results cached for popular queries
- Cache invalidation on data updates
- Memory-efficient caching implementation

## Data Processing

### Text Normalization
- Case-insensitive search
- Whitespace trimming
- Special character handling
- Unicode normalization

### Hashtag Processing
- Automatic hashtag extraction from content
- Case-insensitive hashtag matching
- Hashtag frequency calculation
- Trending analysis algorithms

### Result Ranking
- Relevance-based sorting
- Recency weighting for posts
- User activity scoring
- Engagement-based ranking (future)

## Error Handling
- **400 Bad Request**: Invalid query parameters, feature disabled
- **404 Not Found**: No results found for query
- **500 Internal Server Error**: Database or search errors

## Integration Points

### With Users Module
- Searches user profiles and information
- Validates user data in search results
- Provides user discovery functionality

### With Posts Module
- Searches post content and metadata
- Includes post engagement data
- Maintains post-user relationships

### With Feature Flags Module
- Checks if advanced search is enabled
- Controls search feature availability
- Provides graceful degradation

## Usage Examples

### Search Users
```typescript
// GET /search/users?q=john&limit=5
const users = await searchService.searchUsers('john', 5);
```

### Search Posts
```typescript
// GET /search/posts?q=javascript&limit=10
const posts = await searchService.searchPosts('javascript', 10);
```

### Get Trending Tags
```typescript
// GET /search/trending-tags?limit=15
const trending = await searchService.getTrendingTags(15);
```

## Security Considerations
- Input sanitization for search queries
- SQL injection prevention (NoSQL injection)
- Rate limiting for search endpoints
- User privacy in search results

## Performance Metrics
- Search response time optimization
- Index usage monitoring
- Query performance analysis
- Cache hit rate tracking

## Dependencies
- `mongoose` - MongoDB ODM and text search
- `class-validator` - Input validation
- `FeatureFlagsService` - Feature availability
- Users and Posts modules for data access

## Future Enhancements
- Elasticsearch integration for advanced search
- Machine learning-based relevance scoring
- Real-time search suggestions
- Search analytics and insights
- Advanced filtering options
- Saved searches functionality

## Notes
- Search is case-insensitive by default
- Hashtag search supports partial matching
- Trending tags are calculated in real-time
- Feature flag controls entire search functionality
- Results are limited to prevent performance issues
- User privacy settings respected in search results