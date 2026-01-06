# Flappy Social Media Platform - Complete API Documentation

## Overview
Flappy is a comprehensive social media platform backend built with NestJS, featuring user authentication, post management, social interactions, and real-time feeds. The platform supports text, image, and GIF posts with hashtag functionality, reactions, comments, and advanced search capabilities.

## Base URL
```
http://localhost:3000
```

## Authentication
The API no longer uses JWT tokens. Instead, all protected endpoints require `userId` and `email` to be included in the request body for user identification and authorization.

---

## 🔐 Authentication Module

### POST /auth/signup
**Purpose**: Register a new user account  
**Business Logic**: Creates user with hashed password, validates uniqueness of email/phone/username  
**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "phone": "9876543210",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Validation Rules**:
- `email`: Valid email format with proper domain (required)
- `phone`: Exactly 10 digits, numbers only (optional)
- `username`: Minimum 3 characters, letters/numbers/underscores only (required)
- `password`: Minimum 8 characters with at least one uppercase, one lowercase, one number, and one special character (@$!%*?&) (required)

**Note**: Do not include `confirmPassword` field in the request. Password confirmation should be handled on the frontend only.

**Response (201 Created)**:
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Console Logs**:
- 🔐 Registration attempt with user details
- ✅ User creation success with ID
- ❌ Registration failures with reasons

---

### POST /auth/login
**Purpose**: Authenticate existing user  
**Business Logic**: Validates credentials, returns user data for session management  
**Authentication**: None required

**Request Body**:
```json
{
  "emailOrPhone": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules**:
- `emailOrPhone`: Email address or 10-digit phone number (required)
- `password`: User's password (required)

**Response (200 OK)**:
```json
{
  "message": "Login successful",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Console Logs**:
- 🔐 Login attempt with identifier
- ✅ Authentication success with user details
- ❌ Login failures (user not found, invalid password)

---

### POST /auth/otp/verify
**Purpose**: Verify OTP for phone number authentication (Mock Implementation)  
**Business Logic**: Currently accepts hardcoded OTP '123456' for testing  
**Authentication**: None required

**Request Body**:
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Validation Rules**:
- `phone`: Exactly 10 digits (required)
- `otp`: Exactly 6 digits (required)

**Response (200 OK)**:
```json
{
  "message": "OTP verified successfully"
}
```

**Console Logs**:
- 📱 OTP verification attempt (OTP masked in logs)
- ✅ OTP verification success
- ❌ OTP verification failures

---

### POST /auth/token/refresh
**Purpose**: Refresh expired access token using refresh token  
**Business Logic**: Validates refresh token and generates new access token  
**Authentication**: None required (uses refresh token)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules**:
- `refreshToken`: String (required)

**Response (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Console Logs**:
- 🔄 Token refresh attempt
- ✅ Token validation and new token generation
- ❌ Invalid refresh token errors

---

## 👤 Users Module

### GET /users/:id
**Purpose**: Retrieve user profile information  
**Business Logic**: Returns user data excluding password, supports public profile viewing  
**Authentication**: None required

**Path Parameters**:
- `id`: User ID (ObjectId)

**Response (200 OK)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "user@example.com",
  "username": "johndoe",
  "bio": "Software developer and coffee enthusiast",
  "website": "https://johndoe.dev",
  "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg",
  "createdAt": "2023-09-06T10:30:00.000Z",
  "updatedAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- 👤 User profile fetch request
- ✅ Profile retrieval success with username/email
- ❌ User not found errors

---

### PUT /users/:id
**Purpose**: Update user profile information  
**Business Logic**: Allows users to update bio, website, and username  
**Authentication**: JWT required

**Path Parameters**:
- `id`: User ID (ObjectId)

**Request Body**:
```json
{
  "username": "newusername",
  "bio": "Updated bio text",
  "website": "https://newwebsite.com"
}
```

**Validation Rules**:
- `username`: String (optional)
- `bio`: String (optional)
- `website`: Valid URL format (optional)

**Response (200 OK)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "user@example.com",
  "username": "newusername",
  "bio": "Updated bio text",
  "website": "https://newwebsite.com",
  "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg",
  "updatedAt": "2023-09-06T11:00:00.000Z"
}
```

**Console Logs**:
- ✏️ Profile update attempt with fields being updated
- ✅ Profile update success
- ❌ Update failures with error details

---

### POST /users/:id/upload-photo
**Purpose**: Upload user profile photo to S3  
**Business Logic**: Handles file upload, generates S3 URL, updates user profile  
**Authentication**: JWT required

**Path Parameters**:
- `id`: User ID (ObjectId)

**Request**: Multipart form data with 'photo' field

**Response (201 Created)**:
```json
{
  "profilePhotoUrl": "https://your-bucket.s3.amazonaws.com/users/profile-pictures/64f8a1b2c3d4e5f6a7b8c9d0-1694001234567.jpg"
}
```

**Console Logs**:
- 📸 Photo upload attempt with file details
- ✅ Photo upload success with S3 URL
- ❌ Upload failures with file information

---

### GET /users/search
**Purpose**: Search users by username  
**Business Logic**: Case-insensitive regex search, limited to 20 results  
**Authentication**: None required

**Query Parameters**:
- `username`: Search query string (required)

**Response (200 OK)**:
```json
[
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "username": "johndoe",
    "email": "user@example.com",
    "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
  }
]
```

**Console Logs**:
- 🔍 User search request with query
- ✅ Search completion with result count
- ❌ Search failures

---

## 🚩 Feature Flags Module

### GET /feature-flags
**Purpose**: Get all feature flags configuration  
**Business Logic**: Returns current feature flag settings for the application  
**Authentication**: None required

**Response (200 OK)**:
```json
{
  "enableImagePosts": true,
  "enableGifPosts": true,
  "enableVideoUploads": false,
  "enableAdvancedSearch": true
}
```

**Console Logs**:
- 🚩 Feature flags request
- ✅ Feature flags retrieval success
- ❌ Feature flags retrieval failures

---

### GET /feature-flags/post-types
**Purpose**: Get enabled post types based on feature flags  
**Business Logic**: Returns array of post types that are currently enabled  
**Authentication**: None required

**Response (200 OK)**:
```json
{
  "enabledTypes": ["text", "image", "gif"]
}
```

**Console Logs**:
- 📝 Enabled post types request
- ✅ Enabled post types retrieval success
- ❌ Enabled post types retrieval failures

---

## 📝 Posts Module

### POST /posts
**Purpose**: Create a new post (text, image, or GIF)  
**Business Logic**: Extracts hashtags from content, supports media URLs, validates post type  
**Authentication**: Requires userId and email in request body

**Request Body**:
```json
{
  "type": "text",
  "content": "This is my first post! #excited #newuser",
  "mediaUrl": "https://example.com/image.jpg",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Validation Rules**:
- `type`: Must be one of the enabled post types (validated against feature flags)
- `content`: String (required)
- `mediaUrl`: String (optional, required for image/gif posts)
- `userId`: UUID string (required)
- `email`: Valid email format (required)

**Note**: Available post types depend on feature flag configuration. Use `/feature-flags/post-types` to get currently enabled types.

**Response (201 Created)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "type": "text",
  "content": "This is my first post! #excited #newuser",
  "mediaUrl": "https://example.com/image.jpg",
  "hashtags": ["excited", "newuser"],
  "createdAt": "2023-09-06T10:30:00.000Z",
  "updatedAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- 📝 Post creation attempt with type and content length
- ✅ Post creation success with hashtag count
- ❌ Post creation failures

---

### GET /posts/:id
**Purpose**: Retrieve a specific post with user details  
**Business Logic**: Populates user information, returns complete post data  
**Authentication**: None required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Response (200 OK)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "userId": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "username": "johndoe",
    "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
  },
  "type": "text",
  "content": "This is my first post! #excited #newuser",
  "hashtags": ["excited", "newuser"],
  "createdAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- 📖 Post fetch request
- ✅ Post retrieval success with user details
- ❌ Post not found errors

---

### PUT /posts/:id
**Purpose**: Update an existing post  
**Business Logic**: Only post owner can update, re-extracts hashtags from updated content  
**Authentication**: JWT required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "content": "Updated post content #updated",
  "mediaUrl": "https://example.com/newimage.jpg"
}
```

**Validation Rules**:
- `content`: String (optional)
- `mediaUrl`: String (optional)

**Response (200 OK)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "userId": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "username": "johndoe",
    "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
  },
  "type": "text",
  "content": "Updated post content #updated",
  "hashtags": ["updated"],
  "updatedAt": "2023-09-06T11:00:00.000Z"
}
```

**Console Logs**:
- ✏️ Post update attempt with fields being updated
- ✅ Post update success
- ❌ Update failures (not found, unauthorized)

---

### DELETE /posts/:id
**Purpose**: Delete a post  
**Business Logic**: Only post owner can delete, removes post from database  
**Authentication**: JWT required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Response (200 OK)**:
```json
{
  "message": "Post deleted successfully"
}
```

**Console Logs**:
- 🗑️ Post deletion attempt
- ✅ Post deletion success
- ❌ Deletion failures (not found, unauthorized)

---

### GET /posts/trending-tags
**Purpose**: Get top 10 trending hashtags  
**Business Logic**: Aggregates hashtags across all posts, sorts by usage count  
**Authentication**: None required

**Response (200 OK)**:
```json
[
  {
    "tag": "excited",
    "count": 25
  },
  {
    "tag": "newuser",
    "count": 18
  }
]
```

**Console Logs**:
- 📈 Trending tags fetch request
- ✅ Trending tags retrieval with count and top tag
- ❌ Retrieval failures

---

## 🏠 Feed Module

### GET /feed/home
**Purpose**: Get paginated home feed with like information and bookmark status  
**Business Logic**: Returns all posts sorted by newest, 10 posts per page, includes like counts, user like status, and bookmark status  
**Authentication**: None required (userId optional for like status and bookmark status)

**Query Parameters**:
- `page`: Page number (default: 1)
- `userId`: User ID (optional, for checking like status and bookmark status on posts)

**Response (200 OK)**:
```json
{
  "posts": [
    {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "userId": {
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "username": "johndoe",
        "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
      },
      "type": "text",
      "content": "Latest post content",
      "hashtags": ["example", "feed"],
      "reactions": {
        "love": 3,
        "laugh": 2
      },
      "userReaction": "love",
      "commentCount": 4,
      "likeCount": 5,
      "isLiked": true,
      "isBookmarked": false,
      "createdAt": "2023-09-06T10:30:00.000Z"
    }
  ],
  "page": 1,
  "hasMore": true
}
```

**Console Logs**:
- 🏠 Home feed request with page number and userId
- ✅ Feed retrieval with post count and pagination info
- ❌ Feed retrieval failures

**Performance Notes**:
- Bookmark status is included in bulk feed response to avoid N+1 queries
- Only shows bookmark status for other users' posts (own posts show `isBookmarked: false`)

---

### GET /feed/reels
**Purpose**: Get paginated reels feed (image/GIF posts only) with like information and bookmark status  
**Business Logic**: Filters posts by type (image/gif), sorted by newest, includes like counts, user like status, and bookmark status  
**Authentication**: None required (userId optional for like status and bookmark status)

**Query Parameters**:
- `page`: Page number (default: 1)
- `userId`: User ID (optional, for checking like status and bookmark status on posts)

**Response (200 OK)**: Same structure as home feed, but filtered for visual content

**Console Logs**:
- 🎬 Reels feed request with page number and userId
- ✅ Reels feed retrieval with post count
- ❌ Feed retrieval failures

---

### GET /feed/explore
**Purpose**: Get paginated explore feed with engagement-based ranking, like information, and bookmark status  
**Business Logic**: Returns posts with engagement-based sorting (currently chronological), includes like counts, user like status, and bookmark status  
**Authentication**: None required (userId optional for like status and bookmark status)

**Query Parameters**:
- `page`: Page number (default: 1)
- `userId`: User ID (optional, for checking like status and bookmark status on posts)

**Response (200 OK)**: Same structure as home feed with engagement-based ordering

**Console Logs**:
- 🔍 Explore feed request with page number and userId
- ✅ Explore feed retrieval with post count
- ❌ Feed retrieval failures

**Performance Notes**:
- Currently uses chronological sorting (engagement algorithm to be implemented)
- Bookmark status included in bulk response for optimal performance

---

### GET /feed/explore
**Purpose**: Get paginated explore feed  
**Business Logic**: Currently returns all posts (engagement-based ranking to be implemented)  
**Authentication**: None required

**Query Parameters**:
- `page`: Page number (default: 1)

**Response (200 OK)**: Same structure as home feed

**Console Logs**:
- 🔍 Explore feed request with page number
- ✅ Explore feed retrieval with post count
- ❌ Feed retrieval failures

---

## 💬 Interactions Module

### POST /posts/:id/like
**Purpose**: Toggle like on a post (like/unlike functionality)  
**Business Logic**: Creates or removes like based on current state, maintains one like per user per post  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Response (201 Created)**:
```json
{
  "message": "Post liked successfully",
  "isLiked": true,
  "likeCount": 5
}
```

**Response for Unlike (201 Created)**:
```json
{
  "message": "Post unliked successfully",
  "isLiked": false,
  "likeCount": 4
}
```

**Console Logs**:
- ❤️ Post like toggle attempt
- ✅ Like toggle success with new state and count
- ❌ Like toggle failures

---

### GET /posts/:id/likes
**Purpose**: Get like information for a post  
**Business Logic**: Returns total like count and whether current user has liked the post  
**Authentication**: None required (userId optional for like status)

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Query Parameters**:
- `userId`: User ID (optional, for checking if user has liked the post)

**Response (200 OK)**:
```json
{
  "likeCount": 5,
  "isLiked": true
}
```

**Console Logs**:
- ❤️ Post like attempt
- ✅ Like success
- ❌ Like failures

---

### POST /posts/:id/comment
**Purpose**: Add a comment to a post  
**Business Logic**: Creates comment linked to post and user, supports nested replies  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "text": "Great post! Thanks for sharing.",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Validation Rules**:
- `text`: String (required)
- `userId`: UUID string (required)
- `email`: Valid email format (required)

**Response (201 Created)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "postId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Great post! Thanks for sharing.",
  "replies": [],
  "createdAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- 💬 Comment addition attempt with text length
- ✅ Comment creation success with comment ID
- ❌ Comment creation failures

---

### POST /posts/:id/comment/:commentId/reply
**Purpose**: Reply to a specific comment  
**Business Logic**: Adds nested reply to existing comment  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)
- `commentId`: Comment ID (ObjectId)

**Request Body**:
```json
{
  "text": "I agree with your comment!",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Validation Rules**:
- `text`: String (required)
- `userId`: UUID string (required)
- `email`: Valid email format (required)

**Response (201 Created)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "postId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Great post! Thanks for sharing.",
  "replies": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "I agree with your comment!",
      "createdAt": "2023-09-06T10:35:00.000Z"
    }
  ],
  "createdAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- ↩️ Reply addition attempt with text length
- ✅ Reply creation success
- ❌ Reply creation failures

---

### POST /posts/:id/pin
**Purpose**: Pin a post (Mock Implementation)  
**Business Logic**: Currently returns success message, actual pin functionality to be implemented  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Response (201 Created)**:
```json
{
  "message": "Post pinned successfully"
}
```

**Console Logs**:
- 📌 Post pin attempt
- ✅ Pin success
- ❌ Pin failures

---

### POST /posts/:id/save
**Purpose**: Toggle bookmark on a post (bookmark/unbookmark functionality)  
**Business Logic**: Creates or removes bookmark based on current state, prevents users from bookmarking their own posts, maintains one bookmark per user per post  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Response for Bookmark (201 Created)**:
```json
{
  "message": "Post bookmarked successfully",
  "isBookmarked": true
}
```

**Response for Unbookmark (201 Created)**:
```json
{
  "message": "Post removed from bookmarks",
  "isBookmarked": false
}
```

**Error Response (400 Bad Request)**:
```json
{
  "message": "You cannot bookmark your own posts",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Error Response (404 Not Found)**:
```json
{
  "message": "Post not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**Console Logs**:
- 💾 Post bookmark toggle attempt
- ✅ Bookmark toggle success with new state
- ❌ Bookmark toggle failures

**Business Rules**:
- Users cannot bookmark their own posts
- One bookmark per user per post (toggle functionality)
- Bookmarks are automatically removed if the original post is deleted

---

### GET /posts/user/:userId/bookmarks
**Purpose**: Get all bookmarked posts for a specific user  
**Business Logic**: Returns all posts bookmarked by the user with full post data, reactions, and comment counts  
**Authentication**: None required (public endpoint)

**Path Parameters**:
- `userId`: User ID (UUID)

**Response (200 OK)**:
```json
{
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "userId": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "userId": "550e8400-e29b-41d4-a716-446655440001",
        "username": "postauthor",
        "profilePhotoUrl": null
      },
      "email": "author@example.com",
      "type": "text",
      "content": "This is a bookmarked post",
      "hashtags": ["example", "bookmark"],
      "reactions": {
        "love": 5,
        "laugh": 2
      },
      "userReaction": "love",
      "commentCount": 3,
      "likeCount": 7,
      "isLiked": true,
      "bookmarkedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

**Console Logs**:
- 🔖 User bookmarks fetch attempt
- ✅ Bookmarks retrieved with count
- ❌ Bookmark retrieval failures

---

### GET /posts/:id/bookmark-status
**Purpose**: Check if a specific post is bookmarked by a user  
**Business Logic**: Returns bookmark status for a specific post and user combination  
**Authentication**: None required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Query Parameters**:
- `userId`: User ID (UUID, required)

**Response (200 OK)**:
```json
{
  "isBookmarked": true
}
```

**Console Logs**:
- 🔖 Bookmark status check
- ✅ Bookmark status retrieved
- ❌ Bookmark status check failures

---

### GET /posts/:id/comments
**Purpose**: Get all comments for a post  
**Business Logic**: Returns comments with replies, populated with user details  
**Authentication**: None required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Response (200 OK)**:
```json
[
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "postId": "64f8a1b2c3d4e5f6a7b8c9d1",
    "userId": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "username": "commenter",
      "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
    },
    "text": "Great post! Thanks for sharing.",
    "replies": [
      {
        "userId": {
          "id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "username": "replier",
          "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile2.jpg"
        },
        "text": "I agree!",
        "createdAt": "2023-09-06T10:35:00.000Z"
      }
    ],
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
]
```

**Console Logs**:
- � Coemments fetch request
- ✅ Comments retrieval with count
- ❌ Comments retrieval failures

---

## 😊 Reactions Module

### POST /posts/:id/react
**Purpose**: Add or update reaction to a post  
**Business Logic**: Supports emoji reactions (love, laugh, wow, sad, angry), one reaction per user per post  
**Authentication**: Requires userId and email in request body

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Request Body**:
```json
{
  "type": "love",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Validation Rules**:
- `type`: Enum ['love', 'laugh', 'wow', 'sad', 'angry'] (required)
- `userId`: UUID string (required)
- `email`: Valid email format (required)

**Response (201 Created)**:
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "postId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "love",
  "createdAt": "2023-09-06T10:30:00.000Z",
  "updatedAt": "2023-09-06T10:30:00.000Z"
}
```

**Console Logs**:
- 😊 Reaction addition attempt with type
- ✅ Reaction creation/update success
- ❌ Reaction failures

---

### GET /posts/:id/reactions
**Purpose**: Get reaction counts for a post  
**Business Logic**: Aggregates reactions by type, returns count for each reaction type  
**Authentication**: None required

**Path Parameters**:
- `id`: Post ID (ObjectId)

**Response (200 OK)**:
```json
{
  "love": 15,
  "laugh": 8,
  "wow": 3,
  "sad": 1,
  "angry": 0
}
```

**Console Logs**:
- 📊 Reactions fetch request
- ✅ Reactions retrieval with types and total count
- ❌ Reactions retrieval failures

---

## 🔍 Search Module

### GET /search/users
**Purpose**: Search users by username or email  
**Business Logic**: Case-insensitive regex search, limited to 20 results, excludes passwords  
**Authentication**: None required

**Query Parameters**:
- `q`: Search query string (required)

**Response (200 OK)**:
```json
[
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "username": "johndoe",
    "email": "john@example.com",
    "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg",
    "bio": "Software developer"
  }
]
```

**Console Logs**:
- 🔍 User search request with query
- ✅ Search completion with result count
- ❌ Search failures

---

### GET /search/posts
**Purpose**: Search posts by content or hashtags  
**Business Logic**: Case-insensitive regex search on content and hashtags, limited to 20 results  
**Authentication**: None required

**Query Parameters**:
- `q`: Search query string (required)

**Response (200 OK)**:
```json
[
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "userId": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "username": "johndoe",
      "profilePhotoUrl": "https://bucket.s3.amazonaws.com/profile.jpg"
    },
    "type": "text",
    "content": "This post contains the search query",
    "hashtags": ["searchable"],
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
]
```

**Console Logs**:
- 🔍 Post search request with query
- ✅ Search completion with result count
- ❌ Search failures

---

### GET /search/trending-tags
**Purpose**: Get top 10 trending hashtags  
**Business Logic**: Same as /posts/trending-tags, aggregates hashtag usage across all posts  
**Authentication**: None required

**Response (200 OK)**:
```json
[
  {
    "tag": "trending",
    "count": 42
  },
  {
    "tag": "popular",
    "count": 38
  }
]
```

**Console Logs**:
- 📈 Trending tags search request
- ✅ Trending tags retrieval with count and top tag
- ❌ Retrieval failures

---

## Error Responses

All endpoints return consistent error responses:

### Validation Error (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

### Unauthorized (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Not Found (404 Not Found)
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### Conflict (409 Conflict)
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

### Internal Server Error (500 Internal Server Error)
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**Common HTTP Status Codes**:
- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## Rate Limiting

The API implements rate limiting:
- **Limit**: 10 requests per 60 seconds per IP
- **Headers**: Rate limit information included in response headers
- **Throttling**: Requests exceeding limit receive 429 status code

---

## Data Models & Schemas

### User Schema
```typescript
{
  email: string (unique, required, valid email format)
  phone: string (unique, optional, exactly 10 digits)
  username: string (unique, required, min: 3 chars, letters/numbers/underscores only)
  password: string (hashed, required, min: 8 chars, must contain uppercase, lowercase, number, special char)
  bio: string (optional)
  website: string (optional, URL format)
  profilePhotoUrl: string (optional)
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

### Post Schema
```typescript
{
  userId: ObjectId (ref: User, required)
  type: enum ['text', 'image', 'gif'] (required)
  content: string (required)
  mediaUrl: string (optional)
  hashtags: string[] (auto-extracted from content)
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

### Comment Schema
```typescript
{
  postId: ObjectId (ref: Post, required)
  userId: ObjectId (ref: User, required)
  text: string (required)
  replies: [{
    userId: ObjectId (ref: User, required)
    text: string (required)
    createdAt: Date (auto-generated)
  }]
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

### Reaction Schema
```typescript
{
  postId: ObjectId (ref: Post, required)
  userId: ObjectId (ref: User, required)
  type: enum ['love', 'laugh', 'wow', 'sad', 'angry'] (required)
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

---

## Business Logic Summary

### Authentication & Security
- **Password Security**: Bcrypt hashing with 12 salt rounds
- **JWT Tokens**: 24-hour access tokens, 7-day refresh tokens
- **Authorization**: Route-level guards for protected endpoints
- **Validation**: DTO validation with class-validator decorators

### Content Management
- **Hashtag Extraction**: Automatic extraction from post content using regex
- **Media Support**: S3 integration for profile photos and post media
- **Content Types**: Support for text, image, and GIF posts
- **Ownership Validation**: Users can only modify their own content

### Social Features
- **Reactions**: Five emoji types with one reaction per user per post
- **Comments & Replies**: Nested comment system with user population
- **Search**: Full-text search across users and posts
- **Feeds**: Paginated feeds with different filtering (home, reels, explore)

### Performance & Scalability
- **Pagination**: 10 items per page for feeds and search results
- **Database Indexing**: Unique indexes on email, phone, username
- **Aggregation**: MongoDB aggregation for trending tags and reaction counts
- **Rate Limiting**: Request throttling to prevent abuse

### Mock Implementations (To Be Completed)
- **OTP Verification**: Currently accepts hardcoded '123456'
- **Like/Pin/Save**: Return success messages without database persistence
- **S3 Upload**: Generates mock URLs without actual file upload
- **Engagement Ranking**: Explore feed uses simple chronological sorting

---

## Console Logging Format

All API endpoints include comprehensive console logging with:
- **Emojis**: Visual indicators for different operations
- **Timestamps**: ISO format timestamps for all operations
- **Request Details**: User IDs, parameters, and relevant data
- **Success Metrics**: Result counts, IDs, and operation outcomes
- **Error Information**: Detailed error messages and context
- **Business Logic**: Key decision points and data transformations

**Example Log Format**:
```
🔐 [AUTH] POST /auth/login - Login attempt { emailOrPhone: 'user@example.com', timestamp: '2023-09-06T10:30:00.000Z' }
✅ [AUTH] POST /auth/login - Login successful { userId: '64f8a1b2c3d4e5f6a7b8c9d0', email: 'user@example.com', username: 'johndoe' }
```

---

## API Endpoint Summary

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/auth/signup` | No | Register new user |
| POST | `/auth/login` | No | Authenticate user |
| POST | `/auth/otp/verify` | No | Verify OTP (mock) |
| POST | `/auth/token/refresh` | No | Refresh access token |
| GET | `/users/:id` | No | Get user profile |
| PUT | `/users/:id` | Yes | Update user profile |
| POST | `/users/:id/upload-photo` | Yes | Upload profile photo |
| GET | `/users/search` | No | Search users |
| POST | `/posts` | Yes | Create post (respects feature flags) |
| GET | `/posts/:id` | No | Get post |
| PUT | `/posts/:id` | Yes | Update post |
| DELETE | `/posts/:id` | Yes | Delete post |
| GET | `/posts/trending-tags` | No | Get trending hashtags |
| GET | `/feed/home` | No | Get home feed |
| GET | `/feed/reels` | No | Get reels feed |
| GET | `/feed/explore` | No | Get explore feed |
| POST | `/posts/:id/like` | Yes | Like post (mock) |
| POST | `/posts/:id/comment` | Yes | Add comment |
| POST | `/posts/:id/comment/:commentId/reply` | Yes | Reply to comment |
| POST | `/posts/:id/pin` | Yes | Pin post (mock) |
| POST | `/posts/:id/save` | Yes | Toggle bookmark on post |
| GET | `/posts/user/:userId/bookmarks` | No | Get user's bookmarked posts |
| GET | `/posts/:id/bookmark-status` | No | Check bookmark status |
| GET | `/posts/:id/comments` | No | Get post comments |
| POST | `/posts/:id/react` | Yes | Add reaction |
| GET | `/posts/:id/reactions` | No | Get reaction counts |
| GET | `/search/users` | No | Search users |
| GET | `/search/posts` | No | Search posts |
| GET | `/search/trending-tags` | No | Get trending hashtags |
| GET | `/feature-flags` | No | Get feature flags |
| GET | `/feature-flags/post-types` | No | Get enabled post types |

This documentation provides a complete reference for all API endpoints, their purposes, business logic, request/response formats, and expected behaviors in the Flappy social media platform.