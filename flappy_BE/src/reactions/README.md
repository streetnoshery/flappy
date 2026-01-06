# Reactions Module

## Overview
The Reactions module handles user reactions to posts, primarily "love" reactions (heart/like functionality). It provides endpoints for adding, removing, and retrieving reaction data with feature flag integration.

## Architecture
- **Controller**: `reactions.controller.ts` - HTTP request handlers
- **Service**: `reactions.service.ts` - Business logic and database operations
- **Schemas**: `schemas/` - MongoDB document schemas for Reaction model
- **DTOs**: `dto/` - Request/response validation objects
- **Module**: `reactions.module.ts` - NestJS module configuration

## Features
- Love/heart reactions on posts
- Toggle reaction functionality (add/remove)
- Reaction count aggregation
- User-specific reaction status
- Feature flag integration (`ENABLE_REACTIONS`)

## Database Schema

### Reaction Document
```typescript
{
  userId: string,        // User UUID who reacted
  postId: ObjectId,      // Reference to Post
  type: 'love',          // Reaction type (currently only 'love')
  createdAt: Date        // Timestamp of reaction
}
```

## API Endpoints

### POST /reactions
Add a reaction to a post.

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "postId": "mongodb-object-id (required)",
  "type": "love (required)"
}
```

**Response:**
```json
{
  "message": "Reaction added successfully",
  "reaction": {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "postId": "mongodb-object-id",
    "type": "love",
    "createdAt": "ISO-date"
  }
}
```

### DELETE /reactions
Remove a reaction from a post.

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
  "message": "Reaction removed successfully"
}
```

### GET /reactions/post/:postId
Get all reactions for a specific post.

**Parameters:**
- `postId` - MongoDB ObjectId of the post

**Response:**
```json
{
  "reactions": [
    {
      "_id": "mongodb-object-id",
      "userId": "uuid-string",
      "postId": "mongodb-object-id",
      "type": "love",
      "createdAt": "ISO-date"
    }
  ],
  "count": "number",
  "types": {
    "love": "number"
  }
}
```

### GET /reactions/user/:userId/post/:postId
Check if a user has reacted to a specific post.

**Parameters:**
- `userId` - UUID string of the user
- `postId` - MongoDB ObjectId of the post

**Response:**
```json
{
  "hasReacted": "boolean",
  "reaction": {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "postId": "mongodb-object-id",
    "type": "love",
    "createdAt": "ISO-date"
  }
}
```

## Feature Flag Integration
The reactions module respects the `ENABLE_REACTIONS` feature flag:

```typescript
// Feature flag check
if (!featureFlagsService.isFeatureEnabled('enableReactions')) {
  throw new BadRequestException('Reactions are currently disabled');
}
```

When `ENABLE_REACTIONS=false`:
- All reaction endpoints return 400 Bad Request
- Frontend should hide reaction buttons
- Existing reactions remain in database but are not accessible

## Business Logic

### Reaction Toggle
- **Add Reaction**: Creates new reaction if none exists
- **Remove Reaction**: Deletes existing reaction
- **Duplicate Prevention**: One reaction per user per post
- **Type Validation**: Currently only 'love' type supported

### Reaction Counting
- Real-time count calculation
- Aggregation by reaction type
- Efficient counting queries
- Integration with feed module for display

### Data Integrity
- Validates post existence before allowing reactions
- Ensures user authentication
- Maintains referential integrity
- Prevents duplicate reactions

## Validation Rules

### Reaction Creation
- Valid userId (UUID format)
- Valid postId (MongoDB ObjectId)
- Valid reaction type ('love' only currently)
- Post must exist in database
- User must exist in database

### Reaction Removal
- Valid userId and postId
- Reaction must exist for the user-post combination
- User must own the reaction being removed

## Error Handling
- **400 Bad Request**: Invalid input, feature disabled, duplicate reactions
- **404 Not Found**: Post not found, reaction not found
- **500 Internal Server Error**: Database or server errors

## Integration Points

### With Posts Module
- Validates post existence for reactions
- Provides reaction counts for post display
- Maintains post-reaction relationships

### With Users Module
- Validates user existence
- Ensures user authentication
- Links reactions to user profiles

### With Feed Module
- Supplies like counts for feed display
- Provides reaction status for posts
- Enables engagement metric calculation

### With Feature Flags Module
- Checks if reactions are enabled
- Controls feature availability
- Provides graceful degradation

## Usage Examples

### Add Love Reaction
```typescript
const reactionData = {
  userId: 'user-uuid-here',
  postId: 'post-object-id-here',
  type: 'love'
};
// POST /reactions
```

### Remove Reaction
```typescript
const removeData = {
  userId: 'user-uuid-here',
  postId: 'post-object-id-here'
};
// DELETE /reactions
```

### Check User Reaction Status
```typescript
// GET /reactions/user/user-uuid-here/post/post-object-id-here
const reactionStatus = await reactionsService.getUserReaction(userId, postId);
```

## Performance Considerations
- Compound index on `userId` and `postId` for efficient queries
- Optimized counting queries for large datasets
- Minimal data transfer in responses
- Efficient duplicate detection

## Dependencies
- `mongoose` - MongoDB ODM
- `class-validator` - Input validation
- `FeatureFlagsService` - Feature availability checking
- Posts and Users modules for validation

## Security Features
- User authentication required for all operations
- Input validation and sanitization
- Duplicate reaction prevention
- Referential integrity checks

## Future Enhancements
- Multiple reaction types (like, love, laugh, angry, etc.)
- Reaction analytics and insights
- Reaction notifications
- Reaction history tracking
- Bulk reaction operations

## Notes
- Currently supports only 'love' reaction type
- One reaction per user per post (toggle behavior)
- Feature flag controls entire module availability
- Reactions are permanently stored (soft delete not implemented)
- Real-time counting for immediate feedback
- Integration with feed module for display purposes