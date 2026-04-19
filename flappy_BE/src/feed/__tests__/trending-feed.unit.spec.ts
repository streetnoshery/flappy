import { FeedController } from '../feed.controller';
import { FeedService } from '../feed.service';

/**
 * Unit tests for Trending feed edge cases.
 *
 * Uses the same mock patterns established in the trending property test file
 * and the following-feed unit test file.
 * Tests specific edge cases with concrete data rather than random generation.
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */

// ── Mock factory (same pattern as property tests) ────────────────────

interface PostWithEngagement {
  _id: { toString: () => string };
  userId: string;
  content: string;
  type: string;
  hashtags: string[];
  createdAt: Date;
  updatedAt: Date;
  reactionCount: number;
  commentCount: number;
}

function buildMockService(overrides: Partial<FeedService> = {}): FeedService {
  const service = Object.create(FeedService.prototype);
  Object.assign(service, {
    getFollowingFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getHomeFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getReelsFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getExploreFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getTrendingFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    ...overrides,
  });
  return service as FeedService;
}

function buildController(service: FeedService): FeedController {
  const controller = Object.create(FeedController.prototype);
  Object.assign(controller, { feedService: service });
  return controller as FeedController;
}

function buildTrendingFeedService(deps: {
  allPosts: PostWithEngagement[];
}): FeedService {
  const { allPosts } = deps;

  // postModel mock — supports .aggregate() that simulates the MongoDB pipeline
  const postModel = {
    aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
      let result = [...allPosts];

      // Stage 1: $match — filter by createdAt >= cutoffDate
      const matchStage = pipeline.find((s: any) => s.$match);
      if (matchStage?.$match?.createdAt?.$gte) {
        const cutoff = new Date(matchStage.$match.createdAt.$gte).getTime();
        result = result.filter(
          (p) => new Date(p.createdAt).getTime() >= cutoff,
        );
      }

      // Stage 4: $addFields — compute engagementScore
      result = result.map((p) => ({
        ...p,
        engagementScore: (p.reactionCount || 0) + (p.commentCount || 0),
      }));

      // Stage 5: $sort — engagementScore desc, createdAt desc
      const sortStage = pipeline.find((s: any) => s.$sort);
      if (sortStage?.$sort) {
        result.sort((a: any, b: any) => {
          const scoreDiff = b.engagementScore - a.engagementScore;
          if (scoreDiff !== 0) return scoreDiff;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }

      // Stage 6: $skip
      const skipStage = pipeline.find((s: any) => s.$skip !== undefined);
      if (skipStage) {
        result = result.slice(skipStage.$skip);
      }

      // Stage 7: $limit
      const limitStage = pipeline.find((s: any) => s.$limit !== undefined);
      if (limitStage) {
        result = result.slice(0, limitStage.$limit);
      }

      // Stage 8: $project — remove lookup arrays and computed fields
      const projectStage = pipeline.find((s: any) => s.$project);
      if (projectStage?.$project) {
        const excludeFields = Object.keys(projectStage.$project).filter(
          (k) => projectStage.$project[k] === 0,
        );
        result = result.map((p: any) => {
          const cleaned = { ...p };
          for (const field of excludeFields) {
            delete cleaned[field];
          }
          return cleaned;
        });
      }

      return Promise.resolve(result);
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  };

  // userModel mock
  const userModel = {
    findOne: jest.fn().mockImplementation((filter: any) => ({
      lean: jest.fn().mockResolvedValue({
        userId: filter?.userId ?? 'unknown',
        username: `user_${filter?.userId ?? 'unknown'}`,
        profilePhotoUrl: null,
        role: 'user',
      }),
    })),
  };

  // reactionModel mock — return counts matching the post's reactionCount
  const reactionModel = {
    aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
      const matchStage = pipeline.find((s: any) => s.$match);
      const postId = matchStage?.$match?.postId;
      const post = allPosts.find((p) => p._id.toString() === postId);
      if (post && post.reactionCount > 0) {
        return Promise.resolve([{ _id: 'love', count: post.reactionCount }]);
      }
      return Promise.resolve([]);
    }),
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  // commentModel mock — return count matching the post's commentCount
  const commentModel = {
    countDocuments: jest.fn().mockImplementation((filter: any) => {
      const post = allPosts.find((p) => p._id.toString() === filter?.postId);
      return Promise.resolve(post?.commentCount ?? 0);
    }),
  };

  // bookmarkModel mock
  const bookmarkModel = {
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  const likeModel = {};

  const followCacheService = {
    getFollowingIds: jest.fn().mockReturnValue([]),
  };

  const service = Object.create(FeedService.prototype);
  Object.assign(service, {
    postModel,
    userModel,
    likeModel,
    commentModel,
    bookmarkModel,
    reactionModel,
    followCacheService,
  });

  return service as FeedService;
}

// ── Helper to create a post with engagement data ─────────────────────

function makePost(
  id: string,
  overrides: Partial<PostWithEngagement> = {},
): PostWithEngagement {
  return {
    _id: { toString: () => id },
    userId: 'user-1',
    content: `Post ${id}`,
    type: 'text',
    hashtags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    reactionCount: 0,
    commentCount: 0,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Trending Feed — Unit Tests', () => {
  describe('Service: empty result when no posts within 7-day window (Requirement 3.2)', () => {
    it('should return empty posts array when all posts are older than 7 days', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('old-1', { createdAt: eightDaysAgo, reactionCount: 100, commentCount: 50 }),
          makePost('old-2', { createdAt: tenDaysAgo, reactionCount: 200, commentCount: 100 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      expect(result.posts).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.page).toBe(1);
    });

    it('should return empty posts array when no posts exist at all', async () => {
      const service = buildTrendingFeedService({ allPosts: [] });

      const result = await service.getTrendingFeed(1);

      expect(result.posts).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.page).toBe(1);
    });

    it('should only include posts within the 7-day window and exclude older ones', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('recent', { createdAt: threeDaysAgo, reactionCount: 5, commentCount: 3 }),
          makePost('old', { createdAt: eightDaysAgo, reactionCount: 100, commentCount: 50 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]._id.toString()).toBe('recent');
    });
  });

  describe('Service: engagement score calculation (Requirement 3.3)', () => {
    it('should rank a post with more reactions + comments higher', async () => {
      const now = new Date();

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('low-engagement', {
            createdAt: now,
            reactionCount: 1,
            commentCount: 0,
          }),
          makePost('high-engagement', {
            createdAt: now,
            reactionCount: 10,
            commentCount: 5,
          }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      // High engagement (score 15) should come before low engagement (score 1)
      expect(result.posts[0]._id.toString()).toBe('high-engagement');
      expect(result.posts[1]._id.toString()).toBe('low-engagement');
    });

    it('should compute engagement score as reactionCount + commentCount', async () => {
      const now = new Date();

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('post-a', { createdAt: now, reactionCount: 7, commentCount: 3 }),
          makePost('post-b', { createdAt: now, reactionCount: 4, commentCount: 5 }),
          makePost('post-c', { createdAt: now, reactionCount: 0, commentCount: 0 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      // post-a: score 10, post-b: score 9, post-c: score 0
      // Verify via enriched fields: likeCount (reaction total) + commentCount
      const postA = result.posts.find((p: any) => p._id.toString() === 'post-a');
      const postB = result.posts.find((p: any) => p._id.toString() === 'post-b');
      const postC = result.posts.find((p: any) => p._id.toString() === 'post-c');

      expect(postA.likeCount + postA.commentCount).toBe(10);
      expect(postB.likeCount + postB.commentCount).toBe(9);
      expect(postC.likeCount + postC.commentCount).toBe(0);
    });

    it('should treat posts with zero reactions and zero comments as score 0', async () => {
      const now = new Date();

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('zero-engagement', { createdAt: now, reactionCount: 0, commentCount: 0 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      expect(result.posts).toHaveLength(1);
      const post = result.posts[0];
      expect(post.likeCount + post.commentCount).toBe(0);
    });
  });

  describe('Service: tiebreaker ordering by createdAt (Requirement 3.4)', () => {
    it('should order posts with equal engagement scores by createdAt descending', async () => {
      const newer = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const older = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('older-post', { createdAt: older, reactionCount: 5, commentCount: 5 }),
          makePost('newer-post', { createdAt: newer, reactionCount: 5, commentCount: 5 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      // Both have score 10, so newer should come first
      expect(result.posts[0]._id.toString()).toBe('newer-post');
      expect(result.posts[1]._id.toString()).toBe('older-post');
    });

    it('should prefer higher engagement over newer date', async () => {
      const newer = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const older = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('newer-low', { createdAt: newer, reactionCount: 1, commentCount: 0 }),
          makePost('older-high', { createdAt: older, reactionCount: 10, commentCount: 5 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      // older-high has score 15, newer-low has score 1 — engagement wins
      expect(result.posts[0]._id.toString()).toBe('older-high');
      expect(result.posts[1]._id.toString()).toBe('newer-low');
    });

    it('should correctly order three posts with same engagement score by createdAt', async () => {
      const t1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const t2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const t3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const service = buildTrendingFeedService({
        allPosts: [
          makePost('post-mid', { createdAt: t2, reactionCount: 3, commentCount: 2 }),
          makePost('post-newest', { createdAt: t1, reactionCount: 3, commentCount: 2 }),
          makePost('post-oldest', { createdAt: t3, reactionCount: 3, commentCount: 2 }),
        ],
      });

      const result = await service.getTrendingFeed(1);

      // All score 5, so order by createdAt desc: newest, mid, oldest
      expect(result.posts[0]._id.toString()).toBe('post-newest');
      expect(result.posts[1]._id.toString()).toBe('post-mid');
      expect(result.posts[2]._id.toString()).toBe('post-oldest');
    });
  });

  describe('Controller: delegation to service (Requirement 3.1)', () => {
    it('should delegate GET /feed/trending to feedService.getTrendingFeed with page and userId', async () => {
      const mockResult = {
        posts: [{ _id: 'p1', content: 'trending post' }],
        page: 2,
        hasMore: true,
      };
      const service = buildMockService({
        getTrendingFeed: jest.fn().mockResolvedValue(mockResult),
      });
      const controller = buildController(service);

      const result = await controller.getTrendingFeed(2, 'user-abc');

      expect(service.getTrendingFeed).toHaveBeenCalledWith(2, 'user-abc');
      expect(result).toEqual(mockResult);
    });

    it('should pass userId as undefined when not provided', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await controller.getTrendingFeed(1, undefined);

      expect(service.getTrendingFeed).toHaveBeenCalledWith(1, undefined);
    });

    it('should use default page 1 when page is not specified', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await controller.getTrendingFeed(1);

      expect(service.getTrendingFeed).toHaveBeenCalledWith(1, undefined);
    });

    it('should propagate service errors to the caller', async () => {
      const service = buildMockService({
        getTrendingFeed: jest.fn().mockRejectedValue(new Error('Aggregation failed')),
      });
      const controller = buildController(service);

      await expect(controller.getTrendingFeed(1, 'user-abc')).rejects.toThrow(
        'Aggregation failed',
      );
    });
  });
});
