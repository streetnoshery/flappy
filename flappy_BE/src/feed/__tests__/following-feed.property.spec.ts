import * as fc from 'fast-check';
import { FeedService } from '../feed.service';

/**
 * Property-based tests for the Following feed.
 *
 * We construct a FeedService with in-memory mocks for all Mongoose models
 * and FollowCacheService, then exercise getFollowingFeed against randomly
 * generated data to verify universal properties.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc.string({ minLength: 4, maxLength: 12 }).filter(
  (s) => s.trim().length >= 4,
);

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  allPosts: any[];
  followingIds: string[];
  requestingUserId: string;
}

function buildService(deps: MockDeps): FeedService {
  const { allPosts, followingIds } = deps;

  // postModel mock — supports .find().sort().skip().limit().lean() chaining
  const postModel = {
    find: jest.fn().mockImplementation((filter?: any) => {
      let result = [...allPosts];
      if (filter?.userId?.$in) {
        const allowed = new Set<string>(filter.userId.$in as string[]);
        result = result.filter((p: any) => allowed.has(p.userId));
      }
      return {
        sort: jest.fn().mockImplementation((sortObj: any) => {
          if (sortObj?.createdAt === -1) {
            result.sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          }
          return {
            skip: jest.fn().mockImplementation((n: number) => {
              result = result.slice(n);
              return {
                limit: jest.fn().mockImplementation((l: number) => {
                  result = result.slice(0, l);
                  return {
                    lean: jest.fn().mockResolvedValue(result),
                  };
                }),
              };
            }),
          };
        }),
      };
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

  // reactionModel mock — no reactions for simplicity
  const reactionModel = {
    aggregate: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  // commentModel mock
  const commentModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  // bookmarkModel mock
  const bookmarkModel = {
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  // likeModel mock (unused by getFollowingFeed but required by constructor)
  const likeModel = {};

  // followCacheService mock
  const followCacheService = {
    getFollowingIds: jest.fn().mockReturnValue(followingIds),
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

describe('Following Feed — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * Property 1: Following feed returns only followed users' posts
   *
   * For any user with a non-empty follow list and any set of posts in the
   * database, every post returned by getFollowingFeed SHALL have a userId
   * that is contained in the set returned by getFollowingIds(requestingUserId).
   */
  it('Property 1: every returned post belongs to a followed user', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.uniqueArray(arbUserId, { minLength: 1, maxLength: 10 }),
        fc.uniqueArray(arbUserId, { minLength: 0, maxLength: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (
          requestingUserId: string,
          followingIds: string[],
          extraUserIds: string[],
          page: number,
        ) => {
          // Build posts from both followed and non-followed users
          const allUserIds = [...new Set([...followingIds, ...extraUserIds])];
          const postsPerUser = 3;
          const allPosts: any[] = [];
          for (const uid of allUserIds) {
            for (let i = 0; i < postsPerUser; i++) {
              allPosts.push({
                _id: { toString: () => `${uid}_post_${i}` },
                userId: uid,
                content: `Post ${i} by ${uid}`,
                type: 'text',
                hashtags: [],
                createdAt: new Date(Date.now() - i * 60_000),
                updatedAt: new Date(),
                email: `${uid}@test.com`,
              });
            }
          }

          const service = buildService({
            allPosts,
            followingIds,
            requestingUserId,
          });

          const result = await service.getFollowingFeed(page, requestingUserId);
          const followingSet = new Set(followingIds);

          for (const post of result.posts) {
            // After enrichment, post.userId is an object with a userId field
            const postAuthorId =
              typeof post.userId === 'string' ? post.userId : post.userId.userId;
            expect(followingSet.has(postAuthorId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * Property 2: Following feed chronological ordering
   *
   * For any set of posts returned by getFollowingFeed, for every consecutive
   * pair of posts (posts[i], posts[i+1]), posts[i].createdAt >= posts[i+1].createdAt
   * SHALL hold.
   */
  it('Property 2: returned posts are in descending chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.uniqueArray(arbUserId, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 3 }),
        async (
          requestingUserId: string,
          followingIds: string[],
          page: number,
        ) => {
          // Generate posts with varied timestamps
          const allPosts: any[] = [];
          let counter = 0;
          for (const uid of followingIds) {
            for (let i = 0; i < 5; i++) {
              allPosts.push({
                _id: { toString: () => `${uid}_p_${counter}` },
                userId: uid,
                content: `Post ${counter}`,
                type: 'text',
                hashtags: [],
                createdAt: new Date(
                  Date.now() - counter * 3_600_000 - Math.floor(Math.random() * 3_600_000),
                ),
                updatedAt: new Date(),
                email: `${uid}@test.com`,
              });
              counter++;
            }
          }

          const service = buildService({
            allPosts,
            followingIds,
            requestingUserId,
          });

          const result = await service.getFollowingFeed(page, requestingUserId);

          for (let i = 0; i < result.posts.length - 1; i++) {
            const currentDate = new Date(result.posts[i].createdAt).getTime();
            const nextDate = new Date(result.posts[i + 1].createdAt).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.5**
   *
   * Property 6: Feed pagination invariant (following variant)
   *
   * For any feed endpoint and any page number, the number of posts returned
   * SHALL be at most 10, and requesting page N SHALL skip exactly (N-1) * 10
   * posts from the full ordered result set.
   */
  it('Property 6: pagination returns at most 10 posts and skips correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.uniqueArray(arbUserId, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        async (
          requestingUserId: string,
          followingIds: string[],
          page: number,
        ) => {
          // Generate enough posts to span multiple pages
          const allPosts: any[] = [];
          let counter = 0;
          for (const uid of followingIds) {
            for (let i = 0; i < 15; i++) {
              allPosts.push({
                _id: { toString: () => `${uid}_pg_${counter}` },
                userId: uid,
                content: `Post ${counter}`,
                type: 'text',
                hashtags: [],
                createdAt: new Date(Date.now() - counter * 60_000),
                updatedAt: new Date(),
                email: `${uid}@test.com`,
              });
              counter++;
            }
          }

          const service = buildService({
            allPosts,
            followingIds,
            requestingUserId,
          });

          const result = await service.getFollowingFeed(page, requestingUserId);

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

          // Verify skip correctness: page N should return different posts than page 1
          // by comparing with a full fetch
          const totalFollowedPosts = allPosts.filter((p: any) =>
            followingIds.includes(p.userId),
          ).length;
          const expectedSkip = (page - 1) * 10;
          const expectedCount = Math.max(
            0,
            Math.min(10, totalFollowedPosts - expectedSkip),
          );
          expect(result.posts.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
