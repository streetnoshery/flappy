# Implementation Plan: Home Feed Tabs

## Overview

Wire the three Home page tabs (For You, Following, Trending) to distinct backend endpoints. Add `GET /feed/following` (filtered by follow list, chronological) and `GET /feed/trending` (ranked by engagement score within a 7-day window) to the NestJS backend, extract a shared `enrichPosts` helper to eliminate duplication, add matching frontend API methods, and update `Home.js` so each tab calls its own endpoint with a dedicated empty state for the Following tab.

## Tasks

- [x] 1. Import FollowModule into FeedModule and inject FollowCacheService
  - [x] 1.1 Update `flappy_BE/src/feed/feed.module.ts` to import `FollowModule`
    - Add `FollowModule` to the `imports` array so `FollowCacheService` is available for DI
    - _Requirements: 5.1_
  - [x] 1.2 Update `flappy_BE/src/feed/feed.service.ts` constructor to inject `FollowCacheService`
    - Add `private readonly followCacheService: FollowCacheService` to the constructor parameters
    - Import `FollowCacheService` from `../follow/follow-cache.service`
    - _Requirements: 5.2_

- [x] 2. Extract shared `enrichPosts` helper in FeedService
  - [x] 2.1 Create a private `enrichPosts(posts, userId?, currentUserRole?)` method in `feed.service.ts`
    - Extract the duplicated enrichment logic (author lookup, reaction counts, user reaction, comment count, bookmark status, canDelete, likeCount, isLiked) from `getHomeFeed` into a reusable private method
    - The method should accept an array of lean post documents and return enriched posts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 2.2 Refactor `getHomeFeed` to use the new `enrichPosts` helper
    - Replace the inline enrichment logic in `getHomeFeed` with a call to `enrichPosts`
    - Verify the response shape remains identical
    - _Requirements: 9.1, 9.2_
  - [x] 2.3 Refactor `getReelsFeed` and `getExploreFeed` to use `enrichPosts`
    - Replace the inline enrichment logic in both methods with calls to `enrichPosts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Checkpoint — Verify existing feeds still work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Following feed backend
  - [x] 4.1 Add `getFollowingFeed(page, userId)` method to `flappy_BE/src/feed/feed.service.ts`
    - Call `followCacheService.getFollowingIds(userId)` to get the list of followed user IDs
    - If the list is empty, return `{ posts: [], page, hasMore: false }`
    - Query `postModel.find({ userId: { $in: followingIds } }).sort({ createdAt: -1 }).skip(skip).limit(10)`
    - Enrich posts using the shared `enrichPosts` helper
    - Return `{ posts, page, hasMore }` matching the existing `FeedResponse` shape
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7_
  - [x] 4.2 Add `GET /feed/following` route handler to `flappy_BE/src/feed/feed.controller.ts`
    - Accept `page` (default 1) and `userId` query parameters
    - Return HTTP 400 with `{ message: "userId query parameter is required" }` when `userId` is missing or empty
    - Delegate to `feedService.getFollowingFeed(page, userId)`
    - _Requirements: 1.1, 1.6_
  - [x] 4.3 Write property tests for Following feed (Properties 1, 2, 6)
    - **Property 1: Following feed returns only followed users' posts**
    - **Validates: Requirements 1.3**
    - **Property 2: Following feed chronological ordering**
    - **Validates: Requirements 1.4**
    - **Property 6: Feed pagination invariant** (following variant)
    - **Validates: Requirements 1.5**
  - [x] 4.4 Write unit tests for Following feed edge cases
    - Test 400 response when `userId` is missing
    - Test empty posts array when user follows nobody
    - Test correct delegation from controller to service
    - _Requirements: 1.6, 1.7_

- [x] 5. Implement Trending feed backend
  - [x] 5.1 Add `getTrendingFeed(page, userId?)` method to `flappy_BE/src/feed/feed.service.ts`
    - Compute cutoff date: `new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`
    - Use MongoDB aggregation pipeline: `$match` by `createdAt >= cutoffDate`, `$lookup` reactions and comments, `$addFields` for `engagementScore = reactionCount + commentCount`, `$sort` by `{ engagementScore: -1, createdAt: -1 }`, `$skip` / `$limit` for pagination
    - Enrich posts using the shared `enrichPosts` helper
    - Return `{ posts, page, hasMore }` matching the existing `FeedResponse` shape
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 5.2 Add `GET /feed/trending` route handler to `flappy_BE/src/feed/feed.controller.ts`
    - Accept `page` (default 1) and optional `userId` query parameters
    - Delegate to `feedService.getTrendingFeed(page, userId)`
    - _Requirements: 3.1_
  - [x] 5.3 Write property tests for Trending feed (Properties 3, 4, 5, 6)
    - **Property 3: Trending feed time-window filtering**
    - **Validates: Requirements 3.2**
    - **Property 4: Trending feed engagement score correctness**
    - **Validates: Requirements 3.3**
    - **Property 5: Trending feed engagement-based ordering with tiebreaker**
    - **Validates: Requirements 3.4**
    - **Property 6: Feed pagination invariant** (trending variant)
    - **Validates: Requirements 3.5**
  - [x] 5.4 Write unit tests for Trending feed edge cases
    - Test empty result when no posts exist within the 7-day window
    - Test correct engagement score calculation
    - Test tiebreaker ordering by `createdAt`
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 6. Checkpoint — Verify all backend endpoints work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add enrichment property tests
  - [x] 7.1 Write property test for post enrichment completeness (Property 7)
    - **Property 7: Post enrichment completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
  - [x] 7.2 Write property test for home feed preservation (Property 8)
    - **Property 8: Home feed returns all posts without filtering**
    - **Validates: Requirements 9.1**

- [x] 8. Add frontend API methods for new feeds
  - [x] 8.1 Add `getFollowingFeed(page)` and `getTrendingFeed(page)` to `feedAPI` in `flappy_FE/src/services/api.js`
    - `getFollowingFeed`: sends GET to `/feed/following?page=${page}&userId=${user.userId}`
    - `getTrendingFeed`: sends GET to `/feed/trending?page=${page}&userId=${user.userId}`
    - Follow the same pattern as the existing `getHomeFeed` method
    - _Requirements: 6.1, 6.2_

- [x] 9. Update Home.js tab routing and empty state
  - [x] 9.1 Map each tab to its correct API fetch function in `flappy_FE/src/pages/Home.js`
    - `'for-you'` → `feedAPI.getHomeFeed`
    - `'following'` → `feedAPI.getFollowingFeed`
    - `'trending'` → `feedAPI.getTrendingFeed`
    - Update the `useInfiniteQuery` call to use the correct fetch function based on `activeTab`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 9.2 Add `FollowingEmptyState` component to `Home.js`
    - Display a distinct empty-state message when the Following tab returns zero posts (e.g., "You're not following anyone yet")
    - Include a link/button guiding the user to discover accounts (e.g., link to Explore page or search)
    - Show the generic `EmptyFeed` for other tabs and `FollowingEmptyState` only for the Following tab
    - _Requirements: 8.1, 8.2_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Jest
- The shared `enrichPosts` helper is extracted early (task 2) so both new endpoints and existing endpoints benefit from deduplication
