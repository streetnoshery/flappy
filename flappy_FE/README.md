# Flappy Frontend

A React.js frontend for the Flappy social media platform.

## Features

- **Authentication**: Login/Signup with form validation
- **Home Feed**: View latest posts from all users
- **Create Posts**: Text, image, and GIF posts with hashtag support
- **User Profiles**: View and edit user profiles
- **Post Interactions**: Like, comment, react, save posts
- **Search**: Search users and posts with trending hashtags
- **Explore**: Discover trending content
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- React.js
- React Router (Navigation)
- React Query (Data fetching)
- React Hook Form (Form handling)
- Tailwind CSS (Styling)
- Axios (HTTP client)
- Lucide React (Icons)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your backend URL
```

3. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.js       # Main layout wrapper
│   ├── Navbar.js       # Top navigation bar
│   ├── Sidebar.js      # Side navigation menu
│   ├── PostCard.js     # Individual post component
│   └── LoadingSpinner.js
├── contexts/           # React contexts
│   └── AuthContext.js  # Authentication context
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   │   ├── Login.js
│   │   └── Signup.js
│   ├── Home.js         # Home feed page
│   ├── Profile.js      # User profile page
│   ├── CreatePost.js   # Create new post page
│   ├── PostDetail.js   # Individual post detail page
│   ├── Search.js       # Search page
│   └── Explore.js      # Explore page
├── services/           # API services
│   └── api.js          # API client and endpoints
├── App.js              # Main app component
└── index.js            # App entry point
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Features Overview

### Authentication
- JWT-based authentication
- Protected routes
- Automatic token refresh
- Form validation

### Posts
- Create text, image, and GIF posts
- Hashtag extraction and display
- Like and reaction system
- Comment and reply functionality
- Save posts for later

### User Interface
- Clean, modern design
- Responsive layout
- Loading states
- Error handling
- Toast notifications

### Navigation
- React Router for client-side routing
- Protected and public routes
- Sidebar navigation
- Search functionality

## Environment Variables

```bash
REACT_APP_API_URL=http://localhost:3001
```

## API Integration

The frontend communicates with the backend through a centralized API service that handles:

- Authentication tokens
- Request/response interceptors
- Error handling
- Automatic token refresh

All API calls are managed through React Query for:
- Caching
- Background updates
- Loading states
- Error states