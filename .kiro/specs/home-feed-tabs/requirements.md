# Requirements Document

## Introduction

The Flappy home page displays three feed tabs — For You, Following, and Trending. Currently all three tabs call the same chronological endpoint (`GET /feed/home`), so switching tabs has no effect on the content shown. This feature upgrades the Following and Trending tabs to return distinct, correctly filtered and ranked content while leaving the For You tab unchanged.

## Glossary

- **Feed_Service**: The NestJS backend service (`FeedService`) responsible for querying, enriching, and returning paginated lists of posts.
- **Feed_Controller**: The NestJS controller (`FeedController`) that exposes HTTP endpoints under the `/feed` path.
- **Follow_Cache**: The in-memory cache service (`FollowCacheService`) that provides O(1) lookups of follow relationships, including `getFollowingIds(userId)`.
- **Home_Page**: The React page component (`Home.js`) that renders the three-tab feed interface.
- **API_Service**: The frontend Axios wrapper (`api.js`) that provides typed methods for calling backend endpoints.
- **Post**: A document in the `posts` MongoDB collection containing `userId`, `content`, `type`, `mediaUrl`, `hashtags`, `createdAt`, and `updatedAt` fields.
- **Reaction**: A document in the `reactions` collection representing a user's reaction (love, laugh, wow, sad, angry) to a post, keyed by `postId` and `userId`.
- **Comment**: A document in the `comments` collection representing a user's comment on a post, keyed by `postId` and `userId`.
- **Engagement_Score**: A numeric value computed for each post as the sum of its reaction count and comment count, used for ranking in the Trending feed.
- **Trending_Window**: The time period (configurable, default 7 days) within which posts are eligible for the Trending feed.

## Requirements

### Requirement 1: Following Feed Backend Endpoint

**User Story:** As a logged-in user, I want a dedicated Following feed endpoint, so that I can retrieve posts exclusively from users I follow.

#### Acceptance Criteria

1. WHEN a GET request is made to `/feed/following` with a valid `userId` query parameter, THE Feed_Controller SHALL route the request to the Feed_Service following-feed method.
2. WHEN the Feed_Service processes a following-feed request, THE Feed_Service SHALL retrieve the list of followed user IDs from the Follow_Cache using `getFollowingIds(userId)`.
3. WHEN the followed user ID list is retrieved, THE Feed_Service SHALL query only Post documents whose `userId` field matches one of the followed user IDs.
4. THE Feed_Service SHALL sort following-feed results by `createdAt` in descending order (newest first).
5. THE Feed_Service SHALL paginate following-feed results with a page size of 10 and accept a `page` query parameter.
6. WHEN the `userId` query parameter is missing or empty on the `/feed/following` endpoint, THE Feed_Controller SHALL return an HTTP 400 response with a descriptive error message.
7. WHEN the logged-in user follows zero other users, THE Feed_Service SHALL return an empty posts array with `hasMore` set to false.

### Requirement 2: Following Feed Post Enrichment

**User Story:** As a logged-in user, I want following-feed posts to include the same metadata as the home feed, so that I have a consistent experience across tabs.

#### Acceptance Criteria

1. THE Feed_Service SHALL enrich each following-feed post with the author's `username`, `profilePhotoUrl`, and `userId` from the User collection.
2. THE Feed_Service SHALL include per-post reaction counts grouped by reaction type for each following-feed post.
3. THE Feed_Service SHALL include the requesting user's own reaction (if any) for each following-feed post.
4. THE Feed_Service SHALL include the comment count for each following-feed post.
5. THE Feed_Service SHALL include the bookmark status for each following-feed post when the post author differs from the requesting user.
6. THE Feed_Service SHALL include the `canDelete` flag for each following-feed post based on whether the requesting user is the post author or an admin.

### Requirement 3: Trending Feed Backend Endpoint

**User Story:** As a user, I want a dedicated Trending feed endpoint, so that I can discover the most popular recent content.

#### Acceptance Criteria

1. WHEN a GET request is made to `/feed/trending` with optional `userId` and `page` query parameters, THE Feed_Controller SHALL route the request to the Feed_Service trending-feed method.
2. WHEN the Feed_Service processes a trending-feed request, THE Feed_Service SHALL consider only Post documents created within the Trending_Window (default: last 7 days).
3. WHEN computing the feed order, THE Feed_Service SHALL calculate an Engagement_Score for each eligible post as the sum of its total reaction count and its total comment count.
4. THE Feed_Service SHALL sort trending-feed results in descending order by Engagement_Score, using `createdAt` descending as a tiebreaker for posts with equal scores.
5. THE Feed_Service SHALL paginate trending-feed results with a page size of 10 and accept a `page` query parameter.

### Requirement 4: Trending Feed Post Enrichment

**User Story:** As a user, I want trending-feed posts to include the same metadata as the home feed, so that I have a consistent experience across tabs.

#### Acceptance Criteria

1. THE Feed_Service SHALL enrich each trending-feed post with the author's `username`, `profilePhotoUrl`, and `userId` from the User collection.
2. THE Feed_Service SHALL include per-post reaction counts grouped by reaction type for each trending-feed post.
3. WHEN a `userId` query parameter is provided, THE Feed_Service SHALL include the requesting user's own reaction for each trending-feed post.
4. THE Feed_Service SHALL include the comment count for each trending-feed post.
5. WHEN a `userId` query parameter is provided, THE Feed_Service SHALL include the bookmark status for each trending-feed post when the post author differs from the requesting user.
6. WHEN a `userId` query parameter is provided, THE Feed_Service SHALL include the `canDelete` flag for each trending-feed post.

### Requirement 5: Feed Module Dependency Integration

**User Story:** As a developer, I want the Feed module to have access to follow data, so that the following feed can filter posts by followed users.

#### Acceptance Criteria

1. THE Feed_Module SHALL import the Follow_Module so that Follow_Cache is available for dependency injection into the Feed_Service.
2. THE Feed_Service SHALL receive Follow_Cache via constructor injection.

### Requirement 6: Frontend API Methods for New Feeds

**User Story:** As a frontend developer, I want dedicated API methods for the Following and Trending feeds, so that each tab calls the correct backend endpoint.

#### Acceptance Criteria

1. THE API_Service SHALL expose a `getFollowingFeed(page)` method that sends a GET request to `/feed/following` with `page` and `userId` query parameters.
2. THE API_Service SHALL expose a `getTrendingFeed(page)` method that sends a GET request to `/feed/trending` with `page` and `userId` query parameters.

### Requirement 7: Frontend Tab Routing

**User Story:** As a user, I want each home page tab to display its own feed content, so that switching tabs changes the posts I see.

#### Acceptance Criteria

1. WHEN the "For You" tab is active, THE Home_Page SHALL call `feedAPI.getHomeFeed(page)` to fetch posts.
2. WHEN the "Following" tab is active, THE Home_Page SHALL call `feedAPI.getFollowingFeed(page)` to fetch posts.
3. WHEN the "Trending" tab is active, THE Home_Page SHALL call `feedAPI.getTrendingFeed(page)` to fetch posts.
4. WHEN the user switches between tabs, THE Home_Page SHALL discard the previous tab's cached data and fetch fresh results for the newly selected tab.
5. THE Home_Page SHALL continue to support infinite scroll pagination independently for each tab.

### Requirement 8: Following Feed Empty State

**User Story:** As a user who follows nobody, I want a helpful empty state on the Following tab, so that I understand why no posts appear and know how to fix it.

#### Acceptance Criteria

1. WHEN the Following tab is active and the returned posts array is empty, THE Home_Page SHALL display a distinct empty-state message indicating the user is not following anyone.
2. THE Home_Page SHALL include a prompt or link in the Following empty state that guides the user toward discovering accounts to follow.

### Requirement 9: For You Feed Preservation

**User Story:** As a user, I want the For You tab to continue working exactly as it does today, so that existing behavior is not disrupted.

#### Acceptance Criteria

1. THE Feed_Service SHALL continue to return all posts sorted by `createdAt` descending for the existing `getHomeFeed` method without any filtering by follow status or engagement score.
2. THE Feed_Controller SHALL continue to expose the `GET /feed/home` endpoint with its current request and response contract unchanged.
