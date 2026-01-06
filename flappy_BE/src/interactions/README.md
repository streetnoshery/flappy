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

#### POST /interactions/posts/:postId/comments
Add a comment to a post.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "email": "string (required)",
  "content": "string (required, max: 500)",
  "parentCommentId": "mongodb-object-id (optional)"
}
```

**Response:**
```json
{
  "_id": "mongodb-object-id",
  "postId": "mongodb-object-id",
  "userId": {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "username": "string"
  },
  "content": "string",
  "parentCommentId": "mongodb-object-id",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

#### GET /interactions/posts/:postId/comments
Get all comments for a post.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Response:**
```json
[
  {
    "_id": "mongodb-object-id",
    "postId": "mongodb-object-id",
    "userId": {
      "_id": "mongodb-object-id",
      "userId": "uuid-string",
      "username": "string"
    },
    "content": "string",
    "parentCommentId": "mongodb-object-id",
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date"
  }
]
```

### Bookmarks

#### POST /interactions/bookmarks
Bookmark a post for later viewing.

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "postId": "mongodb-object-id (required)"
}
```

**Response:**
```json
{
  "message": "Post bookmarked successfully",
  "bookmark": {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "postId": "mongodb-object-id",
    "bookmarkedAt": "ISO-date"
  }
}
```

#### DELETE /interactions/bookmarks
Remove a bookmark from a post.

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "postId": "mongodb-object-id (required)"
}
```

**Response:**
```json
{
  "message": "Bookmark removed successfully"
}
```

#### GET /interactions/posts/:userId/bookmarks
Get all bookmarked posts for a user.

**Parameters:**
- `userId` - UUID string of the user

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
    "updatedAt": "ISO-date",
    "bookmarkedAt": "ISO-date"
  }
]
```

## Business Logic

### Comment System
- **Nested Comments**: Support for replies to comments via `parentCommentId`
- **User Population**: Automatic user information inclusion
- **Chronological Order**: Comments sorted by creation date
- **Content Validation**: Maximum 500 characters per comment

### Bookmark System
- **Unique Bookmarks**: One bookmark per user per post
- **Toggle Functionality**: Add/remove bookmarks
- **User Restriction**: Users can only bookmark others' posts
- **Post Population**: Full post data in bookmark responses

### Data Population
- User information populated in all responses
- Post data populated in bookmark responses
- Maintains referential integrity across collections

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