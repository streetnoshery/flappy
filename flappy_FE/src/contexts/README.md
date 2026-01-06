# Contexts Module

## Overview
The Contexts module provides global state management for the React application using React Context API. It manages authentication state, feature flags, and other application-wide data.

## Context Providers
- **AuthContext.js** - User authentication and session management
- **FeatureFlagsContext.js** - Feature flag state and configuration

## AuthContext

### Overview
Manages user authentication state, login/logout functionality, and user session persistence across the application.

### Features
- User authentication state management
- Login and logout functionality
- Session persistence with localStorage
- Loading states for authentication operations
- Error handling for auth operations
- Automatic session restoration on app load

### Context Value
```javascript
{
  user: User | null,           // Current authenticated user
  loading: boolean,            // Authentication loading state
  error: string | null,        // Authentication error message
  login: (credentials) => Promise<void>,    // Login function
  logout: () => void,          // Logout function
  signup: (userData) => Promise<void>       // Signup function
}
```

### User Object Structure
```javascript
{
  userId: "uuid-string",       // Unique user identifier
  username: "string",          // Display username
  email: "string",             // User email address
  phoneNumber: "string"        // User phone number
}
```

### Authentication Flow
```javascript
// Login process
const login = async (credentials) =>