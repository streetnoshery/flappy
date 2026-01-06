# Posts Module

## Overview
The Posts module manages user-generated content including text, image, and GIF posts. It supports post creation, retrieval, and user-specific post queries with feature flag integration.

## Architecture
- **Controller**: `posts.controller.ts` - HTTP request handlers
- **Service**: `posts.service.ts` - Business logic and database operations
- **Schemas**: `schemas/` - MongoDB document schemas
- **DTOs**: `dto/` - Request/response validation objects
- **Module**: `posts.module.ts` - NestJS module configuration

## Features
- Multi-type post creation (text, image, GIF)
- Feature flag integration for post types
- User-specific post retrieval
- Post validation and sanitization
- Hashtag extraction and storage
- Timestamp tracking (created/updated)

## Post Types
1. **Text Posts** - Always enabled
2. **Image Posts** - Controlled by `ENABLE_IMAGE_POSTS` feature flag
3. **GIF Posts** - Controlled by `ENABLE_GIF_POSTS` feature flag

## API Endpoints

### POST /posts
Create a new post.

**Request Body:**
```json
{
  "userId": "uuid-string (required)",
  "email": "string (required)",
  "type": "text|image|gif (required)",
  "content": "string (required, max: 500)",
  "mediaUrl": "string (optional, required for image/gif types)"
}
```

**Response:**
```json
{
  "_id": "mongodb-object-id",
  "userId": "uuid-string",
  "email": "string",
  "type": "string",
  "content": "string",
  "mediaUrl": "string",
  "hashtags": ["string"],
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

### GET /posts/user/:userId
Get all posts by a specific user.

**Parameters:**
- `userId` - UUID of the user

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
    "type": "string",
    "content": "string",
    "mediaUrl": "string",
    "hashtags": ["string"],
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date"
  }
]
```

## Database Schema

### Post Document
```typescript
{
  userId: ObjectId, // Reference to User document
  email: string,
  type: 'text' | 'image' | 'gif',
  content: string,
  mediaUrl?: string,
  hashtags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

## Feature Flag Integration
Posts module integrates with the Feature Flags service to validate post types:

```typescript
// Only enabled post types are allowed
const enabledTypes = featureFlagsService.getEnabledPostTypes();
// Returns: ['text'] when image/gif are disabled
// Returns: ['text', 'image', 'gif'] when all are enabled
```

## Validation Rules

### Content Validation
- Required for all post types
- Maximum 500 characters
- Cannot be empty or whitespace only

### Media URL Validation
- Required for image and GIF posts
- Must be valid URL format
- Optional for text posts

### Type Validation
- Must be one of: 'text', 'image', 'gif'
- Must be enabled via feature flags
- Validated against `FeatureFlagsService.validatePostType()`

## Hashtag Processing
- Automatically extracts hashtags from content
- Hashtags are identified by `#` prefix
- Stored as array of strings without `#` symbol
- Case-insensitive processing

## Population and Relationships
- User data is populated in responses
- Includes username and userId for display
- Maintains reference integrity with User collection

## Error Handling
- **400 Bad Request**: Invalid input data, disabled post type
- **404 Not Found**: User not found for user-specific queries
- **500 Internal Server Error**: Database or server errors

## Usage Examples

### Create Text Post
```typescript
const textPost = {
  userId: 'user-uuid-here',
  email: 'user@example.com',
  type: 'text',
  content: 'Hello world! #firstpost #social'
};
```

### Create Image Post
```typescript
const imagePost = {
  userId: 'user-uuid-here',
  email: 'user@example.com',
  type: 'image',
  content: 'Check out this amazing sunset! #photography',
  mediaUrl: 'https://example.com/sunset.jpg'
};
```

## Dependencies
- `mongoose` - MongoDB ODM
- `class-validator` - Input validation
- `FeatureFlagsService` - Post type validation

## Notes
- All posts require userId and email in request body
- Feature flags control which post types are available
- Hashtags are automatically processed and stored
- User population provides username for display purposes
- Created/updated timestamps are automatically managed