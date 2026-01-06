# Interactions Module

## Overview
The Interactions module handles social interactions including comments and bookmarks. It provides functionality for users to engage with posts through commenting and saving posts for later viewing.

## Architecture
- **Controller**: `interactions.controller.ts` - HTTP request handlers
- **Service**: `interactions.service.ts` - Business logic and database operations
- **Schemas**: `schemas/` - MongoDB document schemas (Comment, Bookmark)
- **DTOs**: `dto/` - Request/response validation objects
- **Module**: `interactions.module.ts` - NestJS module configuration

## Features
- Post commenting system
- Nested reply support
- Bookmark/save posts functionality
- User-specific bookmarks retrieval
- Comment retrieval by post
- Real-time interaction updates

## Database Schemas

### Comment Document
```typescript
{
  postId: ObjectId,      // Reference to Post
  userId: ObjectId,      // Reference to User
  content: string,       // Comment text
  parentCommentId?: ObjectId, // For nested replies
  createdAt: Date,
  updatedAt: Date
}
```

### Bookmark Document
```typescript
{
  userId: string,        // User UUID who bookmarked
  postId: ObjectId,      // Reference to Post
  bookmarkedAt: Date     // Timestamp of bookmark
}
```

## API Endpoints

### Comments

#### POST /posts/:postId/comment
Add a comment to a post.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "email": "string (required)",
  "text": "string (required, max: 500)"
}
```

**Response:**
```json
{
  "data": {
    "_id": "mongodb-object-id",
    "postId": "mongodb-object-id",
    "userId": {
      "_id": "mongodb-object-id",
      "userId": "uuid-string",
      "username": "string",
      "profilePhotoUrl": "string"
    },
    "text": "string",
    "replies": [],
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date"
  }
}
```

#### POST /posts/:postId/comment/:commentId/reply
Add a reply to a comment.

**Parameters:**
- `postId` - MongoDB ObjectId of the post
- `commentId` - MongoDB ObjectId of the comment

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "email": "string (required)",
  "text": "string (required, max: 500)"
}
```

#### GET /posts/:postId/comments
Get all comments for a post.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Response:**
```json
{
  "data": [
    {
      "_id": "mongodb-object-id",
      "postId": "mongodb-object-id",
      "userId": {
        "_id": "mongodb-object-id",
        "userId": "uuid-string",
        "username": "string",
        "profilePhotoUrl": "string"
      },
      "text": "string",
      "replies": [
        {
          "userId": {
            "userId": "uuid-string",
            "username": "string",
            "profilePhotoUrl": "string"
          },
          "text": "string",
          "createdAt": "ISO-date"
        }
      ],
      "createdAt": "ISO-date",
      "updatedAt": "ISO-date"
    }
  ]
}
```

### Bookmarks

#### POST /posts/:postId/save
Toggle bookmark on a post (bookmark/unbookmark).

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "email": "string (required)"
}
```

**Response (Bookmark Added):**
```json
{
  "message": "Post bookmarked successfully",
  "isBookmarked": true
}
```

**Response (Bookmark Removed):**
```json
{
  "message": "Post removed from bookmarks",
  "isBookmarked": false
}
```

**Error Response (Own Post):**
```json
{
  "message": "You cannot bookmark your own posts",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### GET /posts/user/:userId/bookmarks
Get all bookmarked posts for a user.

**Parameters:**
- `userId` - UUID string of the user

**Response:**
```json
{
  "data": [
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
        "laugh": 2
      },
      "userReaction": "love",
      "commentCount": 3,
      "likeCount": 7,
      "isLiked": true,
      "bookmarkedAt": "ISO-date",
      "createdAt": "ISO-date",
      "updatedAt": "ISO-date"
    }
  ]
}
```

#### GET /posts/:postId/bookmark-status
Check if a post is bookmarked by a user.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Query Parameters:**
- `userId` - UUID string of the user

**Response:**
```json
{
  "isBookmarked": true
}
```

## Business Logic

### Comment System
- **Nested Replies**: Support for replies within comments via replies array
- **User Population**: Automatic user information inclusion with profile photos
- **Chronological Order**: Comments sorted by creation date (newest first)
- **Content Validation**: Text field validation with proper error handling

### Bookmark System
- **Toggle Functionality**: Single endpoint for bookmark/unbookmark operations
- **Own Post Restriction**: Users cannot bookmark their own posts (400 Bad Request)
- **Duplicate Prevention**: One bookmark per user per post (automatic toggle)
- **Feed Integration**: Bookmark status included in all feed responses for performance
- **Full Post Data**: Bookmarked posts include reactions, comments, and engagement data

### Performance Optimizations
- **Bulk Loading**: Bookmark status loaded with feed data (eliminates N+1 queries)
- **Compound Indexing**: MongoDB compound index on userId + postId for fast lookups
- **Selective Loading**: Only loads bookmark status for other users' posts
- **User Data Caching**: Efficient user data population to minimize database calls

## Validation Rules

### Comment Validation
- Content required and non-empty
- Maximum 500 characters
- Valid postId (MongoDB ObjectId)
- Valid userId (UUID format)
- Optional parentCommentId for replies

### Bookmark Validation
- Valid postId (MongoDB ObjectId)
- Valid userId (UUID format)
- Post existence verification
- User existence verification

## Error Handling
- **400 Bad Request**: Invalid input data, validation failures
- **404 Not Found**: Post or user not found
- **409 Conflict**: Duplicate bookmark attempts
- **500 Internal Server Error**: Database or server errors

## Integration Points

### With Posts Module
- Validates post existence for comments/bookmarks
- Retrieves post data for bookmark responses
- Maintains post-interaction relationships

### With Users Module
- Validates user existence
- Populates user information in responses
- Ensures user authentication for interactions

### With Feed Module
- Provides comment counts for feed display
- Supplies bookmark status for posts
- Enables engagement metric calculation

## Usage Examples

### Add Comment
```typescript
const commentData = {
  userId: 'user-uuid-here',
  email: 'user@example.com',
  content: 'Great post! Thanks for sharing.',
  parentCommentId: 'parent-comment-id' // Optional for replies
};
```

### Bookmark Post
```typescript
const bookmarkData = {
  userId: 'user-uuid-here',
  postId: 'post-object-id-here'
};
```

### Get User Bookmarks
```typescript
// GET /interactions/posts/user-uuid-here/bookmarks
const userBookmarks = await interactionsService.getUserBookmarks(userId);
```

## Performance Considerations
- Indexes on `postId`, `userId` for efficient queries
- Population queries optimized for minimal data transfer
- Pagination support for large comment threads
- Efficient bookmark lookup and toggle operations

## Dependencies
- `mongoose` - MongoDB ODM
- `class-validator` - Input validation
- Posts and Users modules for data relationships

## Security Features
- User authentication required for all operations
- Input validation and sanitization
- Referential integrity checks
- Duplicate bookmark prevention

## Future Enhancements
- Comment voting/rating system
- Comment moderation features
- Bookmark collections/folders
- Real-time comment notifications
- Comment threading improvements

## Notes
- Comments support nested replies via parentCommentId
- Bookmarks are unique per user-post combination
- All interactions require valid user authentication
- User information is automatically populated in responses
- Timestamps are automatically managed for all interactions