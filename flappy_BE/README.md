# Flappy Backend

A NestJS-based backend for the Flappy social media platform.

## Features

- **Authentication**: JWT-based auth with signup/login/OTP verification
- **User Management**: Profile creation, photo upload, user search
- **Posts**: Create, edit, delete posts with hashtag support
- **Feed**: Home, reels, and explore feeds with pagination
- **Interactions**: Like, comment, reply, pin, save posts
- **Reactions**: Emoji-based reactions (love, laugh, wow, sad, angry)
- **Search**: Search users, posts, and trending hashtags

## Tech Stack

- NestJS (Node.js framework)
- MongoDB (Database)
- JWT (Authentication)
- AWS S3 (Media storage)
- Redis (Caching)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start MongoDB and Redis services

4. Run the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/otp/verify` - OTP verification
- `POST /auth/token/refresh` - Refresh JWT token

### Users
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `POST /users/:id/upload-photo` - Upload profile photo
- `GET /users/search` - Search users by username

### Posts
- `POST /posts` - Create new post
- `GET /posts/:id` - Get single post
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post
- `GET /posts/trending-tags` - Get trending hashtags

### Feed
- `GET /feed/home` - Get home feed
- `GET /feed/reels` - Get reels feed
- `GET /feed/explore` - Get explore feed

### Interactions
- `POST /posts/:id/like` - Like a post
- `POST /posts/:id/comment` - Comment on post
- `POST /posts/:id/comment/:commentId/reply` - Reply to comment
- `POST /posts/:id/pin` - Pin a post
- `POST /posts/:id/save` - Save a post
- `GET /posts/:id/comments` - Get post comments

### Reactions
- `POST /posts/:id/react` - React to post
- `GET /posts/:id/reactions` - Get post reactions

### Search
- `GET /search/users` - Search users
- `GET /search/posts` - Search posts
- `GET /search/trending-tags` - Get trending tags

## Database Schema

### User
```javascript
{
  email: String (unique),
  phone: String (unique, optional),
  username: String (unique),
  password: String (hashed),
  bio: String,
  website: String,
  profilePhotoUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Post
```javascript
{
  userId: ObjectId (ref: User),
  type: String (text|image|gif),
  content: String,
  mediaUrl: String,
  hashtags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Comment
```javascript
{
  postId: ObjectId (ref: Post),
  userId: ObjectId (ref: User),
  text: String,
  replies: [{
    userId: ObjectId (ref: User),
    text: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Reaction
```javascript
{
  postId: ObjectId (ref: Post),
  userId: ObjectId (ref: User),
  type: String (love|laugh|wow|sad|angry),
  createdAt: Date,
  updatedAt: Date
}
```