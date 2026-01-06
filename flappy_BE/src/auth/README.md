# Authentication Module

## Overview
The Authentication module handles user registration, login, and authentication without JWT tokens. It uses UUID-based user identification and direct user credentials in request bodies.

## Architecture
- **Controller**: `auth.controller.ts` - Handles HTTP requests for auth endpoints
- **Service**: `auth.service.ts` - Contains business logic for authentication
- **DTOs**: `dto/` - Data Transfer Objects for request/response validation
- **Module**: `auth.module.ts` - NestJS module configuration

## Features
- User registration with UUID generation
- User login with email/password validation
- Password hashing with bcrypt
- Email format validation
- Phone number validation (10 digits)
- Strong password requirements

## API Endpoints

### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "username": "string (required, min: 3, max: 20)",
  "email": "string (required, valid email format)",
  "password": "string (required, min: 8, uppercase, lowercase, number, special char)",
  "phoneNumber": "string (required, exactly 10 digits)"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "uuid-string",
    "username": "string",
    "email": "string",
    "phoneNumber": "string"
  }
}
```

### POST /auth/login
Authenticate user and return user data.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "userId": "uuid-string",
    "username": "string",
    "email": "string",
    "phoneNumber": "string"
  }
}
```

## Validation Rules

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Email Validation
- Must be valid email format
- Unique across all users

### Phone Number
- Must be exactly 10 digits
- Numeric characters only

### Username
- 3-20 characters
- Unique across all users

## Security Features
- Password hashing using bcrypt
- Input validation and sanitization
- Duplicate email/username prevention
- Strong password enforcement

## Dependencies
- `bcrypt` - Password hashing
- `class-validator` - Input validation
- `class-transformer` - Data transformation
- `uuid` - Unique identifier generation

## Error Handling
- Validation errors return 400 with detailed messages
- Duplicate user errors return 409 Conflict
- Invalid credentials return 401 Unauthorized
- Server errors return 500 Internal Server Error

## Usage Example
```typescript
// Register new user
const signupData = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  phoneNumber: '1234567890'
};

// Login user
const loginData = {
  email: 'john@example.com',
  password: 'SecurePass123!'
};
```

## Notes
- No JWT tokens are used in this implementation
- User identification is handled via UUID in request bodies
- All endpoints are public (no authentication guards)
- Frontend must store and send user credentials for subsequent requests