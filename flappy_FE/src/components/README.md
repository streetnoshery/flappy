# Components Module

## Overview
The Components module contains reusable UI components used throughout the application. These components provide consistent design, functionality, and user experience across all pages.

## Component List
- **Layout.js** - Main application layout wrapper
- **Navbar.js** - Top navigation bar with search and actions
- **Sidebar.js** - Side navigation menu
- **PostCard.js** - Individual post display component
- **ProfilePostCard.js** - Post display for profile pages
- **CommentSection.js** - Comment display and interaction
- **LoadingSpinner.js** - Loading state indicator

## Layout Component

### Features
- Main application structure
- Responsive layout management
- Sidebar toggle functionality
- Consistent spacing and styling
- Mobile-first design approach

### Structure
```javascript
<Layout>
  <Navbar />
  <div className="flex">
    <Sidebar />
    <main>
      <Outlet /> {/* Page content */}
    </main>
  </div>
</Layout>
```

### Responsive Behavior
- **Mobile**: Collapsible sidebar overlay
- **Tablet**: Sidebar toggle with smooth transitions
- **Desktop**: Fixed sidebar with main content area

## Navbar Component

### Features
- Application branding and logo
- Search functionality (feature flag controlled)
- User action buttons (notifications, chat, profile)
- Mobile menu toggle
- Responsive design

### Search Integration
```javascript
// Desktop search input (hidden when advanced search disabled)
{isFeatureEnabled('enableAdvancedSearch') && (
  <SearchInput onClick={() => navigate('/search')} />
)}

// Mobile search button (always visible, shows coming soon if disabled)
<SearchButton onClick={() => navigate('/search')} />
```

### Action Buttons
- **Search**: Navigate to search page
- **Notifications**: Bell icon (feature flag controlled)
- **Chat**: Message icon (feature flag controlled)
- **Profile**: User profile access
- **Logout**: Sign out functionality

### Feature Flag Integration
- Search input visibility controlled by `enableAdvancedSearch`
- Notification bell controlled by `enableNotifications`
- Chat icon controlled by `enableChat`

## Sidebar Component

### Features
- Main navigation menu
- Active page highlighting
- Mobile-responsive overlay
- Smooth animations and transitions
- Icon-based navigation

### Navigation Items
```javascript
const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: PlusSquare, label: 'Create', path: '/create' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: User, label: 'Profile', path: `/profile/${user?.id}` },
];
```

### Mobile Behavior
- Overlay sidebar with backdrop
- Touch-friendly close interactions
- Automatic close on navigation
- Smooth slide animations

## PostCard Component

### Features
- Complete post display with user information
- Interactive elements (like, comment, bookmark)
- Media display for image/GIF posts
- Hashtag rendering and interaction
- Responsive design for all screen sizes
- Real-time engagement updates
- Performance-optimized bookmark status

### Post Display Elements
```javascript
// User information
<UserInfo 
  username={post.userId.username}
  profilePhoto={post.userId.profilePhotoUrl}
  timestamp={post.createdAt}
/>

// Post content
<PostContent 
  type={post.type}
  content={post.content}
  mediaUrl={post.mediaUrl}
  hashtags={post.hashtags}
/>

// Interaction buttons
<PostActions
  likeCount={post.likeCount}
  commentCount={post.commentCount}
  isBookmarked={post.isBookmarked}
  isOwnPost={isOwnPost}
  onLike={handleLike}
  onComment={handleComment}
  onBookmark={handleBookmark}
/>
```

### Interaction Features
- **Like Button**: Heart icon that turns red when liked, shows reaction count
- **Comment Button**: Opens comment section with real-time updates
- **Bookmark Button**: Toggle bookmark functionality with visual feedback
  - Only visible for other users' posts (hidden for own posts)
  - Filled bookmark icon when bookmarked
  - Empty bookmark icon when not bookmarked
  - Instant visual feedback on toggle
  - Prevents multiple bookmark attempts
- **Share Button**: Future enhancement

### Bookmark Functionality
```javascript
// Bookmark state management
const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);

// Bookmark toggle with optimistic updates
const saveMutation = useMutation(
  () => interactionsAPI.savePost(post._id),
  {
    onSuccess: (response) => {
      setIsBookmarked(response.data.isBookmarked);
      // Update cache for all related queries
      queryClient.invalidateQueries('homeFeed');
      queryClient.invalidateQueries('exploreFeed');
      queryClient.invalidateQueries(['userBookmarks', user?.userId]);
    }
  }
);
```

### Performance Optimizations
- **Bulk Data Loading**: Bookmark status loaded with feed data (no separate API calls)
- **Optimistic Updates**: Immediate UI feedback before server confirmation
- **Smart Caching**: Efficient cache invalidation for related queries
- **Conditional Rendering**: Bookmark button only shown for applicable posts

### Feature Flag Integration
- Reaction buttons controlled by `enableReactions` flag
- Bookmark functionality always available for other users' posts
- Comment system always available

### Business Rules
- Users cannot bookmark their own posts (button hidden)
- One bookmark per user per post (toggle functionality)
- Bookmark status visible in all feeds (home, explore)
- Real-time bookmark count updates across all instances

## ProfilePostCard Component

### Features
- Simplified post display for profile pages
- Statistics-only view (no interactive buttons)
- User information display
- Engagement metrics display
- Responsive grid layout

### Display Elements
```javascript
// Post preview
<PostPreview 
  content={post.content}
  mediaUrl={post.mediaUrl}
  type={post.type}
/>

// Statistics display
<PostStats
  likeCount={post.likeCount}
  commentCount={post.commentCount}
  timestamp={post.createdAt}
/>
```

### Differences from PostCard
- No interactive buttons (like, comment, bookmark)
- Focus on content and statistics
- Optimized for grid display
- Simplified user interface

## CommentSection Component

### Features
- Real-time comment display
- Comment submission form
- Nested reply support
- User information in comments
- Loading and error states

### Comment Display
```javascript
// Individual comment
<Comment
  user={comment.userId}
  content={comment.content}
  timestamp={comment.createdAt}
  onReply={handleReply}
/>

// Comment form
<CommentForm
  onSubmit={handleCommentSubmit}
  placeholder="Add a comment..."
  loading={isSubmitting}
/>
```

### Real-time Updates
```javascript
// Auto-refresh comments
const { data: comments } = useQuery(
  ['postComments', postId],
  () => interactionsAPI.getPostComments(postId),
  {
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  }
);
```

### Nested Replies
- Support for comment replies via `parentCommentId`
- Threaded comment display
- Reply form integration
- Visual hierarchy for nested comments

## LoadingSpinner Component

### Features
- Consistent loading indicator
- Customizable size and color
- Accessible loading states
- Smooth animations

### Usage Examples
```javascript
// Page loading
{isLoading && <LoadingSpinner size="large" />}

// Button loading
<button disabled={loading}>
  {loading ? <LoadingSpinner size="small" /> : 'Submit'}
</button>

// Inline loading
<div className="flex items-center">
  <LoadingSpinner size="small" />
  <span>Loading posts...</span>
</div>
```

## Responsive Design Patterns

### Mobile-First Approach
- Base styles for mobile devices
- Progressive enhancement for larger screens
- Touch-friendly interactions
- Optimized spacing and typography

### Breakpoint Strategy
```css
/* Mobile: < 640px (base styles) */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

.component {
  /* Mobile styles */
  @apply p-4 text-sm;
  
  /* Tablet styles */
  @media (min-width: 640px) {
    @apply p-6 text-base;
  }
  
  /* Desktop styles */
  @media (min-width: 1024px) {
    @apply p-8 text-lg;
  }
}
```

## State Management

### Component State
- Local state for UI interactions
- Form state management
- Loading and error states
- User interaction tracking

### Context Integration
```javascript
// Authentication context
const { user, logout } = useAuth();

// Feature flags context
const { isFeatureEnabled } = useFeatureFlags();

// Component logic based on context
const showFeature = isFeatureEnabled('enableReactions') && user;
```

## Performance Optimizations

### Memoization
```javascript
// Memoized components
const PostCard = React.memo(({ post, onLike, onComment }) => {
  // Component logic
});

// Memoized callbacks
const handleLike = useCallback((postId) => {
  // Like logic
}, [user.userId]);
```

### Lazy Loading
- Image lazy loading for media content
- Component lazy loading for heavy components
- Progressive loading for large lists

## Accessibility Features

### ARIA Support
- Proper ARIA labels and roles
- Screen reader announcements
- Keyboard navigation support
- Focus management

### Semantic HTML
```javascript
// Semantic structure
<article role="article" aria-labelledby="post-title">
  <header>
    <h2 id="post-title">{post.title}</h2>
  </header>
  <main>
    <p>{post.content}</p>
  </main>
  <footer>
    <button aria-label="Like post">❤️</button>
  </footer>
</article>
```

## Error Handling

### Error Boundaries
- Component-level error boundaries
- Graceful error recovery
- User-friendly error messages
- Fallback UI components

### Error States
```javascript
// Error handling in components
if (error) {
  return (
    <ErrorMessage 
      message="Failed to load posts"
      onRetry={refetch}
    />
  );
}
```

## Dependencies
- `react` - Core React functionality
- `lucide-react` - Icon components
- `react-router-dom` - Navigation and routing
- `react-query` - Data fetching and caching
- `tailwindcss` - Styling and responsive design

## Design System

### Color Palette
- Primary colors for branding
- Semantic colors for states (success, error, warning)
- Neutral colors for text and backgrounds
- Consistent color usage across components

### Typography
- Consistent font sizes and weights
- Proper heading hierarchy
- Readable line heights and spacing
- Responsive typography scaling

### Spacing System
- Consistent padding and margin values
- Responsive spacing adjustments
- Grid-based layout system
- Proper visual hierarchy

## Future Enhancements
- Component library documentation
- Storybook integration for component showcase
- Advanced animation and micro-interactions
- Theme system for customization
- Component testing suite
- Performance monitoring and optimization

## Notes
- All components are responsive and mobile-friendly
- Feature flags control component behavior and visibility
- Consistent error handling and loading states
- Optimized for performance and accessibility
- Reusable and maintainable component architecture