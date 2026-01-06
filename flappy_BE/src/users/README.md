# Users Module

## Overview
The Users module manages user profiles, user data retrieval, and user-related operations. It handles user information storage and provides endpoints for user profile management.

## Architecture
- **Controller**: `users.controller.ts` - HTTP request handlers
- **Service**: `users.service.ts` - Business logic and database operations
- **Schemas**: `schemas/` - MongoDB document schemas for User model
- **DTOs**: `dto/` - Request/response validation objects
- **Module**: `users.module.ts` - NestJS module configuration

## Features
- User profile management
- User data retrieval by ID
- User search functionality
- Profile information updates
- User existence validation

## Database Schema

### User Document
```typescript
{
  userId: string,        // UUID - Primary identifier
  username: string,      // Unique username
  email: string,         // Unique email address
  password: string,      // Hashed password
  phoneNumber: string,   // 10-digit phone number
  bio?: string,          // Optional user biography
  profilePhotoUrl?: string, // Optional profile picture URL
  createdAt: Date,       // Account creation timestamp
  updatedAt: Date        // Last update timestamp
}
```

## API Endpoints

### GET /users/:userId
Get user profile by UUID.

**Parameters:**
- `userId` - UUID string of the user

**Response:**
```json
{
  "_id": "mongodb-object-id",
  "userId": "uuid-string",
  "username": "string",
  "email": "string",
  "phoneNumber": "string",
  "bio": "string",
  "profilePhotoUrl": "string",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

### PUT /users/:userId
Update user profile information.

**Parameters:**
- `userId` - UUID string of the user

**Request Body:**
```json
{
  "username": "string (optional)",
  "bio": "string (optional)",
  "profilePhotoUrl": "string (optional)",
  "phoneNumber": "string (optional, 10 digits)"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "_id": "mongodb-object-id",
    "userId": "uuid-string",
    "username": "string",
    "email": "string",
    "phoneNumber": "string",
    "bio": "string",
    "profilePhotoUrl": "string",
    "updatedAt": "ISO-date"
  }
}
```

## Validation Rules

### Username
- 3-20 characters
- Must be unique across all users
- Alphanumeric and underscore allowed
- Cannot be changed to existing username

### Phone Number
- Exactly 10 digits
- Numeric characters only
- Must be unique if provided

### Bio
- Maximum 500 characters
- Optional field
- Can contain any text content

### Profile Photo URL
- Must be valid URL format if provided
- Optional field
- Should point to accessible image resource

## Business Logic

### User Lookup
- Primary lookup by UUID (`userId` field)
- Secondary lookup by email for authentication
- Username uniqueness validation
- Existence checks for profile operations

### Profile Updates
- Partial updates supported
- Validation on each field
- Uniqueness checks for username/phone
- Automatic timestamp updates

### Data Security
- Password field excluded from responses
- Sensitive data filtering
- Input sanitization and validation

## Error Handling
- **400 Bad Request**: Invalid input data, validation failures
- **404 Not Found**: User not found by ID
- **409 Conflict**: Username or phone number already exists
- **500 Internal Server Error**: Database or server errors

## Integration Points

### With Auth Module
- User creation during signup
- User validation during login
- Password management

### With Posts Module
- User information population in posts
- User existence validation for post creation

### With Search Module
- User search by username/email
- Profile information in search results

## Usage Examples

### Get User Profile
```typescript
// GET /users/550e8400-e29b-41d4-a716-446655440000
const userProfile = await usersService.findByUserId(userId);
```

### Update User Profile
```typescript
const updateData = {
  username: 'newusername',
  bio: 'Updated bio information',
  profilePhotoUrl: 'https://example.com/new-photo.jpg'
};
// PUT /users/550e8400-e29b-41d4-a716-446655440000
```

## Dependencies
- `mongoose` - MongoDB ODM
- `class-validator` - Input validation
- `class-transformer` - Data transformation
- `bcrypt` - Password hashing (inherited from auth)

## Security Considerations
- Password field never returned in responses
- Input validation prevents injection attacks
- Unique constraints prevent duplicate accounts
- UUID-based identification for security

## Performance Notes
- Indexed fields: `userId`, `email`, `username`
- Efficient lookups by primary identifiers
- Minimal data transfer in responses
- Optimized queries for user search

## Notes
- Users are identified by UUID, not MongoDB ObjectId
- Profile updates are partial and optional
- Username and email must remain unique
- Phone number validation ensures 10-digit format
- Created/updated timestamps are automatically managed