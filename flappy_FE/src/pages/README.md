# Pages Module

## Overview
The Pages module contains all main application pages and user interfaces. Each page is a React component that handles specific functionality and user interactions.

## Page Components
- **Home.js** - Main feed and home page
- **Profile.js** - User profile and posts display
- **CreatePost.js** - Post creation with feature flags
- **Search.js** - Search functionality (feature flag controlled)
- **Bookmarks.js** - Saved posts display
- **Explore.js** - Content discovery page
- **PostDetail.js** - Individual post view with comments

## Common Features
- Responsive design for all screen sizes
- Loading states and error handling
- Integration with authentication context
- Feature flag awareness
- Real-time data updates with React Query

## Home Page

### Features
- Main social media feed
- Infinite scroll or pagination
- Post interactions (like, comment, bookmark)
- Real-time updates
- Loading and error states

### Data Flow
```javascript
const { data: posts, isLoading, error } = useQuery(
  'homeFeed',
  () => feedAPI.getHomeFeed(),
  {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }
);
```

### Components Used
- PostCard for individual posts
- LoadingSpinner for loading states
- Error boundaries for error handling

## Profile Page

### Features
- User profile information display
- User's posts grid/list view
- Profile statistics (posts count, etc.)
- Edit profile functionality (if own profile)
- Responsive layout

### Data Management
```javascript
// Get user profile data
const { data: userProfile } = useQuery(
  ['userProfile', userId],
  () => usersAPI.getUserProfile(userId)
);

// Get user's posts
const { data: userPosts } = useQuery(
  ['userPosts', userId],
  () => postsAPI.getUserPosts(userId)
);
```

### Profile Display
- Profile photo with fallback
- Username and bio
- Post statistics
- Posts grid with engagement metrics
- No interactive buttons (stats-only display)

## Create Post Page

### Features
- Multi-type post creation (text, image, GIF)
- Feature flag integration
- Form validation
- Media URL input for image/GIF posts
- Character count indicator
- Real-time preview

### Feature Flag Integration
```javascript
const { isPostTypeEnabled, getEnabledPostTypes } = useFeatureFlags();

// Filter available post types
const availablePostTypes = allPostTypes.filter(type => 
  isPostTypeEnabled(type.id)
);
```

### Post Types
1. **Text Posts** - Always available
2. **Image Posts** - Controlled by `enableImagePosts` flag
3. **GIF Posts** - Controlled by `enableGifPosts` flag

### Form Validation
- Content required (max 500 characters)
- Media URL required for image/GIF posts
- Post type validation against feature flags
- Real-time character counting

## Search Page

### Features
- User and post search functionality
- Trending hashtags display
- Tabbed interface (Users/Posts)
- Feature flag controlled availability
- Real-time search results

### Feature Flag Behavior
```javascript
const { isFeatureEnabled } = useFeatureFlags();

if (!isFeatureEnabled('enableAdvancedSearch')) {
  return <ComingSoonMessage />;
}
```

### Search Functionality
- User search by username/email
- Post search by content/hashtags
- Trending tags with usage counts
- Debounced search input
- Loading states for search results

## Bookmarks Page

### Features
- Display all user's saved posts in chronological order
- Full post interaction capabilities (like, comment, unbookmark)
- Empty state with helpful messaging
- Responsive grid/list layout
- Real-time bookmark status updates
- Performance-optimized data loading

### Data Management
```javascript
const { data: bookmarksData, isLoading, error } = useQuery(
  ['userBookmarks', user?.userId],
  () => interactionsAPI.getUserBookmarks(user.userId),
  {
    enabled: !!user?.userId,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  }
);

const bookmarks = bookmarksData?.data || [];
```

### Bookmark Display Features
- **Full Post Information**: Complete post content with media
- **Bookmark Timestamp**: Shows when post was bookmarked
- **Engagement Metrics**: Like counts, comment counts, reaction data
- **User Information**: Post author details with profile photos
- **Interactive Elements**: All standard post interactions available
- **Remove Bookmark**: Easy unbookmark functionality

### Performance Optimizations
- **Bulk Data Loading**: All bookmark data loaded in single API call
- **Complete Post Data**: Includes reactions, comments, user data
- **Efficient Caching**: Smart cache management with React Query
- **Optimistic Updates**: Immediate UI feedback for bookmark changes

### User Experience
```javascript
// Empty state handling
{bookmarks.length === 0 ? (
  <div className="text-center py-8">
    <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      No bookmarks yet
    </h3>
    <p className="text-gray-600">
      Posts you bookmark will appear here for easy access later.
    </p>
  </div>
) : (
  <div className="space-y-4">
    {bookmarks.map((post) => (
      <PostCard key={post._id} post={post} />
    ))}
  </div>
)}
```

### Business Logic
- **User-specific Content**: Only shows current user's bookmarks
- **Real-time Updates**: Bookmark changes reflect immediately
- **Post Validation**: Handles deleted posts gracefully
- **Access Control**: Private to authenticated users only

### Integration Points
- **PostCard Component**: Reuses standard post display component
- **Interactions API**: Direct integration with bookmark endpoints
- **Feed Updates**: Changes sync with home and explore feeds
- **Navigation**: Accessible from sidebar navigation

## Explore Page

### Features
- Content discovery interface
- Featured posts or trending content
- Category-based browsing
- Responsive layout
- Integration with search functionality

### Content Discovery
- Popular posts display
- Trending hashtags
- User suggestions
- Category filtering
- Fresh content recommendations

## Post Detail Page

### Features
- Individual post view
- Complete comment section
- Post interactions
- User information display
- Navigation breadcrumbs

### Comment System
```javascript
const { data: comments } = useQuery(
  ['postComments', postId],
  () => interactionsAPI.getPostComments(postId),
  {
    refetchInterval: 30000, // Refresh every 30 seconds
  }
);
```

### Interactions
- Like/love reactions
- Comment submission
- Bookmark functionality
- Share options (future)
- Real-time comment updates

## Responsive Design

### Mobile (< 640px)
- Single column layouts
- Touch-friendly interactions
- Optimized spacing
- Mobile-first navigation

### Tablet (640px - 1024px)
- Two-column layouts where appropriate
- Enhanced spacing and typography
- Better visual hierarchy
- Improved touch targets

### Desktop (> 1024px)
- Multi-column layouts
- Sidebar navigation
- Optimal content width
- Enhanced visual design

## State Management

### React Query Integration
```javascript
// Global query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Context Usage
- AuthContext for user authentication
- FeatureFlagsContext for feature availability
- Global state management for user data

## Error Handling

### Error Boundaries
- Page-level error boundaries
- Graceful error recovery
- User-friendly error messages
- Fallback UI components

### Loading States
```javascript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

## Performance Optimizations

### Code Splitting
- Lazy loading of page components
- Route-based code splitting
- Dynamic imports for heavy components

### Data Optimization
- React Query caching
- Optimistic updates
- Background refetching
- Stale-while-revalidate pattern

### Rendering Optimization
- useCallback and useMemo hooks
- Component memoization
- Virtual scrolling for large lists
- Image lazy loading

## Accessibility

### ARIA Support
- Proper ARIA labels and roles
- Screen reader compatibility
- Keyboard navigation support
- Focus management

### Semantic HTML
- Proper heading hierarchy
- Semantic form elements
- Accessible button and link text
- Alt text for images

## Dependencies
- `react-router-dom` - Page routing and navigation
- `react-query` - Data fetching and caching
- `react-hook-form` - Form management
- `react-hot-toast` - User notifications
- `lucide-react` - Icons and visual elements

## Future Enhancements
- Progressive Web App (PWA) features
- Offline functionality
- Push notifications
- Advanced search filters
- Content recommendations
- Social sharing capabilities

## Notes
- All pages are responsive and mobile-friendly
- Feature flags control page availability and functionality
- Real-time updates using React Query
- Consistent error handling and loading states
- Optimized for performance and accessibility