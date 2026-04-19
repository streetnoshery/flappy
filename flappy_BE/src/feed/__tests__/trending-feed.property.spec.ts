import * as fc from 'fast-check';
import { FeedService } from '../feed.service';

/**
 * Property-based tests for the Trending feed.
 *
 * We construct a FeedService with in-memory mocks for all Mongoose models
 * and FollowCacheService, then exercise getTrendingFeed against randomly
 * generated data to verify universal properties.
 *
 * The getTrendingFeed method uses postModel.aggregate(), so we mock that
 * to simulate the MongoDB aggregation pipeline behavior:
 *   1. Filter posts by createdAt >= 7 days ago
 *   2. Compute engagement scores from reaction/comment counts
 *   3. Sort by engagementScore desc, createdAt desc
 *   4. Apply skip/limit pagination
 *   5. Return results without the lookup arrays
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc
  .string({ minLength: 4, maxLength: 12 })
  .filter((s) => s.trim().length >= 4);

/** Generate a date within the last N days from now */
function arbRecentDate(maxDaysAgo: number): fc.Arbitrary<Date> {
  const now = Date.now();
  return fc
    .integer({ min: 0, max: maxDaysAgo * 24 * 60 * 60 * 1000 })
    .map((ms) => new Date(now - ms));
}

/** Generate a date that spans both inside and outside the 7-day window */
function arbMixedDate(): fc.Arbitrary<Date> {
  const now = Date.now();
  // 0 to 14 days ago — some inside, some outside the 7-day window
  return fc
    .integer({ min: 0, max: 14 * 24 * 60 * 60 * 1000 })
    .map((ms) => new Date(now - ms));
}

// ── Mock factory ─────────────────────────────────────────────────────

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

interface MockDeps {
  allPosts: PostWithEngagement[];
  requestingUserId?: string;
}

function buildService(deps: MockDeps): FeedService {
  const { allPosts } = deps;

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // postModel mock — supports .aggregate() that simulates the pipeline
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

      // Stages 2-3: $lookup — we skip actual lookup but use the
      // reactionCount/commentCount already on the post objects

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
    // Also provide find() for other methods (not used by trending but needed by constructor)
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

  // likeModel mock (unused but required by constructor)
  const likeModel = {};

  // followCacheService mock
  const followCacheService = {
    getFollowingIds: jest.fn().mockReturnValue([]),
  };

  // Construct the service using the mocks — bypass DI
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

// ── Property Tests ───────────────────────────────────────────────────

describe('Trending Feed — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * Property 3: Trending feed time-window filtering
   *
   * For any set of posts with varying createdAt timestamps, every post
   * returned by getTrendingFeed SHALL have a createdAt within the last
   * 7 days, and no post older than 7 days SHALL appear.
   */
  it('Property 3: every returned post is within the 7-day window', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.array(
          fc.record({
            userId: arbUserId,
            createdAt: arbMixedDate(),
            reactionCount: fc.integer({ min: 0, max: 20 }),
            commentCount: fc.integer({ min: 0, max: 20 }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        fc.integer({ min: 1, max: 3 }),
        async (requestingUserId, postSpecs, page) => {
          const allPosts: PostWithEngagement[] = postSpecs.map((spec, i) => ({
            _id: { toString: () => `post_${i}` },
            userId: spec.userId,
            content: `Post ${i}`,
            type: 'text',
            hashtags: [],
            createdAt: spec.createdAt,
            updatedAt: new Date(),
            reactionCount: spec.reactionCount,
            commentCount: spec.commentCount,
          }));

          const service = buildService({ allPosts, requestingUserId });
          const result = await service.getTrendingFeed(page, requestingUserId);

          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

          for (const post of result.posts) {
            const postTime = new Date(post.createdAt).getTime();
            expect(postTime).toBeGreaterThanOrEqual(sevenDaysAgo);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * Property 4: Trending feed engagement score correctness
   *
   * For any post returned by getTrendingFeed, its computed engagement score
   * SHALL equal the sum of total reaction count and total comment count.
   */
  it('Property 4: engagement score equals reaction count + comment count', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.array(
          fc.record({
            userId: arbUserId,
            reactionCount: fc.integer({ min: 0, max: 50 }),
            commentCount: fc.integer({ min: 0, max: 50 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        async (requestingUserId, postSpecs) => {
          const now = Date.now();
          const allPosts: PostWithEngagement[] = postSpecs.map((spec, i) => ({
            _id: { toString: () => `post_${i}` },
            userId: spec.userId,
            content: `Post ${i}`,
            type: 'text',
            hashtags: [],
            // All posts within the 7-day window so they appear in results
            createdAt: new Date(now - i * 60_000),
            updatedAt: new Date(),
            reactionCount: spec.reactionCount,
            commentCount: spec.commentCount,
          }));

          const service = buildService({ allPosts, requestingUserId });
          const result = await service.getTrendingFeed(1, requestingUserId);

          // After enrichment, the enrichPosts method computes reactions and commentCount.
          // We verify that the enriched reaction total + commentCount matches the
          // original reactionCount + commentCount for each post.
          for (const enrichedPost of result.posts) {
            const postId =
              typeof enrichedPost._id === 'string'
                ? enrichedPost._id
                : enrichedPost._id.toString();
            const originalPost = allPosts.find(
              (p) => p._id.toString() === postId,
            );
            if (!originalPost) continue;

            const expectedScore =
              originalPost.reactionCount + originalPost.commentCount;

            // likeCount is the sum of all reactions (backward compat field)
            const actualReactionTotal = enrichedPost.likeCount ?? 0;
            const actualCommentCount = enrichedPost.commentCount ?? 0;
            const actualScore = actualReactionTotal + actualCommentCount;

            expect(actualScore).toBe(expectedScore);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Property 5: Trending feed engagement-based ordering with tiebreaker
   *
   * For any set of posts returned by getTrendingFeed, for every consecutive
   * pair, either engagementScore[i] > engagementScore[i+1], or they're equal
   * and createdAt[i] >= createdAt[i+1].
   */
  it('Property 5: posts are sorted by engagement score desc, then createdAt desc', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.array(
          fc.record({
            userId: arbUserId,
            reactionCount: fc.integer({ min: 0, max: 30 }),
            commentCount: fc.integer({ min: 0, max: 30 }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        async (requestingUserId, postSpecs) => {
          const now = Date.now();
          const allPosts: PostWithEngagement[] = postSpecs.map((spec, i) => ({
            _id: { toString: () => `post_${i}` },
            userId: spec.userId,
            content: `Post ${i}`,
            type: 'text',
            hashtags: [],
            // All within 7-day window, spread out in time
            createdAt: new Date(now - i * 3_600_000),
            updatedAt: new Date(),
            reactionCount: spec.reactionCount,
            commentCount: spec.commentCount,
          }));

          const service = buildService({ allPosts, requestingUserId });
          const result = await service.getTrendingFeed(1, requestingUserId);

          // Compute engagement scores for the returned posts
          for (let i = 0; i < result.posts.length - 1; i++) {
            const currentPost = result.posts[i];
            const nextPost = result.posts[i + 1];

            const currentScore =
              (currentPost.likeCount ?? 0) + (currentPost.commentCount ?? 0);
            const nextScore =
              (nextPost.likeCount ?? 0) + (nextPost.commentCount ?? 0);

            if (currentScore === nextScore) {
              // Tiebreaker: createdAt descending
              const currentTime = new Date(currentPost.createdAt).getTime();
              const nextTime = new Date(nextPost.createdAt).getTime();
              expect(currentTime).toBeGreaterThanOrEqual(nextTime);
            } else {
              expect(currentScore).toBeGreaterThan(nextScore);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * Property 6: Feed pagination invariant (trending variant)
   *
   * The number of posts returned SHALL be at most 10, and requesting page N
   * SHALL skip exactly (N-1) * 10 posts.
   */
  it('Property 6: pagination returns at most 10 posts and skips correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.integer({ min: 1, max: 10 }),
        async (requestingUserId, page) => {
          const now = Date.now();
          // Generate enough posts to span multiple pages — all within 7-day window
          const allPosts: PostWithEngagement[] = [];
          for (let i = 0; i < 35; i++) {
            allPosts.push({
              _id: { toString: () => `post_${i}` },
              userId: `user_${i % 5}`,
              content: `Post ${i}`,
              type: 'text',
              hashtags: [],
              createdAt: new Date(now - i * 60_000),
              updatedAt: new Date(),
              reactionCount: 35 - i, // Decreasing scores for deterministic ordering
              commentCount: 0,
            });
          }

          const service = buildService({ allPosts, requestingUserId });
          const result = await service.getTrendingFeed(page, requestingUserId);

          // At most 10 posts per page
          expect(result.posts.length).toBeLessThanOrEqual(10);

          // Verify page number is correctly returned
          expect(result.page).toBe(page);

          // Verify hasMore flag consistency
          if (result.posts.length < 10) {
            expect(result.hasMore).toBe(false);
          }
          if (result.posts.length === 10) {
            expect(result.hasMore).toBe(true);
          }

          // Verify skip correctness: total eligible posts = 35 (all within window)
          const expectedSkip = (page - 1) * 10;
          const totalEligible = 35;
          const expectedCount = Math.max(
            0,
            Math.min(10, totalEligible - expectedSkip),
          );
          expect(result.posts.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
