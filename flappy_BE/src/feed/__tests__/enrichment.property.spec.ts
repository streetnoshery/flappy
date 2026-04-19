import * as fc from 'fast-check';
import { FeedService } from '../feed.service';

/**
 * Property-based tests for post enrichment completeness and home feed preservation.
 *
 * We construct a FeedService with in-memory mocks for all Mongoose models
 * and FollowCacheService, then exercise feed methods against randomly
 * generated data to verify universal properties.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc
  .string({ minLength: 4, maxLength: 12 })
  .filter((s) => s.trim().length >= 4);

/** Valid reaction types from the Reaction schema */
const REACTION_TYPES = ['love', 'laugh', 'wow', 'sad', 'angry'] as const;

/** Arbitrary reaction type */
const arbReactionType: fc.Arbitrary<string> = fc.constantFrom(...REACTION_TYPES);

/** Arbitrary role */
const arbRole: fc.Arbitrary<string> = fc.constantFrom('user', 'admin');

// ── Mock factory for enrichment tests ────────────────────────────────

interface ReactionDoc {
  postId: string;
  userId: string;
  type: string;
}

interface PostSpec {
  postAuthorId: string;
  reactions: ReactionDoc[];
  commentCount: number;
  hasBookmark: boolean;
}

interface EnrichmentMockDeps {
  postSpecs: PostSpec[];
  requestingUserId: string;
  requestingUserRole: string;
}

function buildEnrichmentService(deps: EnrichmentMockDeps): FeedService {
  const { postSpecs, requestingUserId, requestingUserRole } = deps;

  // Build post documents
  const allPosts = postSpecs.map((spec, i) => ({
    _id: { toString: () => `post_${i}` },
    userId: spec.postAuthorId,
    content: `Post ${i}`,
    type: 'text',
    hashtags: [],
    createdAt: new Date(Date.now() - i * 60_000),
    updatedAt: new Date(),
  }));

  // Build a lookup of reactions per post
  const reactionsByPost = new Map<string, ReactionDoc[]>();
  postSpecs.forEach((spec, i) => {
    reactionsByPost.set(`post_${i}`, spec.reactions);
  });

  // Build a lookup of comment counts per post
  const commentCountByPost = new Map<string, number>();
  postSpecs.forEach((spec, i) => {
    commentCountByPost.set(`post_${i}`, spec.commentCount);
  });

  // Build a lookup of bookmarks per post
  const bookmarkByPost = new Map<string, boolean>();
  postSpecs.forEach((spec, i) => {
    bookmarkByPost.set(`post_${i}`, spec.hasBookmark);
  });

  // postModel mock — supports .find().sort().skip().limit().lean() chaining
  const postModel = {
    find: jest.fn().mockImplementation(() => {
      let result = [...allPosts];
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

  // userModel mock — returns author info and requesting user's role
  const userModel = {
    findOne: jest.fn().mockImplementation((filter: any, _fields?: string) => ({
      lean: jest.fn().mockResolvedValue({
        userId: filter?.userId ?? 'unknown',
        username: `user_${filter?.userId ?? 'unknown'}`,
        profilePhotoUrl: `https://photo.test/${filter?.userId ?? 'unknown'}.jpg`,
        role: filter?.userId === requestingUserId ? requestingUserRole : 'user',
      }),
    })),
  };

  // reactionModel mock — returns grouped counts from our generated reactions
  const reactionModel = {
    aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
      const matchStage = pipeline.find((s: any) => s.$match);
      const postId = matchStage?.$match?.postId;
      const reactions = reactionsByPost.get(postId) || [];

      // Group by type
      const grouped = new Map<string, number>();
      for (const r of reactions) {
        grouped.set(r.type, (grouped.get(r.type) || 0) + 1);
      }

      const result = Array.from(grouped.entries()).map(([type, count]) => ({
        _id: type,
        count,
      }));
      return Promise.resolve(result);
    }),
    findOne: jest.fn().mockImplementation((filter: any) => {
      const postId = filter?.postId;
      const userId = filter?.userId;
      const reactions = reactionsByPost.get(postId) || [];
      const userReaction = reactions.find((r) => r.userId === userId);
      return {
        lean: jest.fn().mockResolvedValue(userReaction ? { type: userReaction.type } : null),
      };
    }),
  };

  // commentModel mock
  const commentModel = {
    countDocuments: jest.fn().mockImplementation((filter: any) => {
      const count = commentCountByPost.get(filter?.postId) ?? 0;
      return Promise.resolve(count);
    }),
  };

  // bookmarkModel mock
  const bookmarkModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      const postId = filter?.postId;
      const hasBookmark = bookmarkByPost.get(postId) ?? false;
      return {
        lean: jest.fn().mockResolvedValue(hasBookmark ? { postId, userId: filter?.userId } : null),
      };
    }),
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

describe('Post Enrichment — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
   *
   * Property 7: Post enrichment completeness
   *
   * For any post returned by any feed endpoint, the enriched post SHALL contain:
   * (a) author username, profilePhotoUrl, and userId
   * (b) a reactions object with counts grouped by type that matches actual reaction documents
   * (c) a commentCount that matches actual comment document count
   * (d) a userReaction that is the requesting user's reaction type or null
   * (e) an isBookmarked flag that is true only when a bookmark exists and the post author
   *     differs from the requesting user
   * (f) a canDelete flag that is true only when the requesting user is the post author
   *     or has admin role
   */
  it('Property 7: enriched posts contain all required fields with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Requesting user
        arbUserId,
        arbRole,
        // Generate post specs with reactions, comments, bookmarks
        fc.array(
          fc.record({
            postAuthorId: arbUserId,
            reactions: fc.array(
              fc.record({
                oddsUserId: arbUserId,
                type: arbReactionType,
              }),
              { minLength: 0, maxLength: 8 },
            ),
            commentCount: fc.integer({ min: 0, max: 20 }),
            hasBookmark: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        // Whether the requesting user has a reaction on each post
        fc.array(
          fc.option(arbReactionType, { nil: undefined }),
          { minLength: 5, maxLength: 5 },
        ),
        async (requestingUserId, requestingUserRole, rawPostSpecs, userReactionChoices) => {
          // Build post specs with proper reaction documents
          const postSpecs: PostSpec[] = rawPostSpecs.map((raw, i) => {
            // Build reaction docs from other users
            const reactions: ReactionDoc[] = raw.reactions.map((r, j) => ({
              postId: `post_${i}`,
              userId: r.oddsUserId,
              type: r.type,
            }));

            // Optionally add the requesting user's reaction
            const userReactionChoice = userReactionChoices[i % userReactionChoices.length];
            if (userReactionChoice) {
              // Remove any existing reaction from the requesting user to avoid duplicates
              const filtered = reactions.filter((r) => r.userId !== requestingUserId);
              filtered.push({
                postId: `post_${i}`,
                userId: requestingUserId,
                type: userReactionChoice,
              });
              return {
                postAuthorId: raw.postAuthorId,
                reactions: filtered,
                commentCount: raw.commentCount,
                hasBookmark: raw.hasBookmark,
              };
            }

            // Ensure requesting user has no reaction
            return {
              postAuthorId: raw.postAuthorId,
              reactions: reactions.filter((r) => r.userId !== requestingUserId),
              commentCount: raw.commentCount,
              hasBookmark: raw.hasBookmark,
            };
          });

          const service = buildEnrichmentService({
            postSpecs,
            requestingUserId,
            requestingUserRole,
          });

          const result = await service.getHomeFeed(1, requestingUserId);

          for (let i = 0; i < result.posts.length; i++) {
            const enriched = result.posts[i];
            const spec = postSpecs[i];

            // (a) Author info: username, profilePhotoUrl, userId
            expect(enriched.userId).toBeDefined();
            expect(typeof enriched.userId).toBe('object');
            expect(enriched.userId.username).toBe(`user_${spec.postAuthorId}`);
            expect(enriched.userId.profilePhotoUrl).toBe(
              `https://photo.test/${spec.postAuthorId}.jpg`,
            );
            expect(enriched.userId.userId).toBe(spec.postAuthorId);

            // (b) Reactions object with counts grouped by type
            expect(enriched.reactions).toBeDefined();
            expect(typeof enriched.reactions).toBe('object');

            // Compute expected reaction counts from spec
            const expectedReactionCounts: Record<string, number> = {};
            for (const r of spec.reactions) {
              expectedReactionCounts[r.type] = (expectedReactionCounts[r.type] || 0) + 1;
            }
            expect(enriched.reactions).toEqual(expectedReactionCounts);

            // (c) commentCount matches
            expect(enriched.commentCount).toBe(spec.commentCount);

            // (d) userReaction is the requesting user's reaction type or null
            const expectedUserReaction =
              spec.reactions.find((r) => r.userId === requestingUserId)?.type ?? null;
            expect(enriched.userReaction).toBe(expectedUserReaction);

            // (e) isBookmarked: true only when bookmark exists AND post author differs
            const postAuthorDiffers = spec.postAuthorId !== requestingUserId;
            const expectedIsBookmarked = spec.hasBookmark && postAuthorDiffers;
            expect(enriched.isBookmarked).toBe(expectedIsBookmarked);

            // (f) canDelete: true only when requesting user is post author or admin
            const isAuthor = spec.postAuthorId === requestingUserId;
            const isAdmin = requestingUserRole === 'admin';
            const expectedCanDelete = isAuthor || isAdmin;
            // canDelete may be truthy/falsy, normalize to boolean
            expect(!!enriched.canDelete).toBe(expectedCanDelete);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Home Feed Preservation Mock Factory ──────────────────────────────

interface HomeFeedMockDeps {
  allPosts: any[];
  requestingUserId: string;
}

function buildHomeFeedService(deps: HomeFeedMockDeps): FeedService {
  const { allPosts, requestingUserId } = deps;

  // postModel mock — supports .find().sort().skip().limit().lean() chaining
  // Crucially, find() is called WITHOUT any filter for the home feed
  const postModel = {
    find: jest.fn().mockImplementation((filter?: any) => {
      let result = [...allPosts];
      // Home feed should NOT apply any filter — if a filter is passed, apply it
      // (but we expect no filter for getHomeFeed)
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

  // likeModel mock
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

describe('Home Feed Preservation — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * Property 8: Home feed returns all posts without filtering
   *
   * For any set of posts in the database, getHomeFeed SHALL return posts
   * from all users (no filtering by follow status or engagement score),
   * sorted by createdAt descending.
   */
  it('Property 8: home feed returns all posts without filtering, sorted by createdAt desc', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        // Generate posts from multiple different users
        fc.array(
          fc.record({
            authorId: arbUserId,
            minutesAgo: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (requestingUserId, postRecords) => {
          const allPosts = postRecords.map((rec, i) => ({
            _id: { toString: () => `post_${i}` },
            userId: rec.authorId,
            content: `Post ${i}`,
            type: 'text',
            hashtags: [],
            createdAt: new Date(Date.now() - rec.minutesAgo * 60_000),
            updatedAt: new Date(),
          }));

          const service = buildHomeFeedService({
            allPosts,
            requestingUserId,
          });

          const result = await service.getHomeFeed(1, requestingUserId);

          // Collect all unique author IDs from the input posts (limited to page size)
          const sortedPosts = [...allPosts].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          const expectedPage = sortedPosts.slice(0, 10);

          // (1) No filtering: the number of returned posts should match the expected page
          expect(result.posts.length).toBe(expectedPage.length);

          // (2) All user IDs from the expected page should be present in the result
          const expectedAuthorIds = new Set(expectedPage.map((p) => p.userId));
          const returnedAuthorIds = new Set(
            result.posts.map((p: any) =>
              typeof p.userId === 'string' ? p.userId : p.userId.userId,
            ),
          );
          for (const authorId of expectedAuthorIds) {
            expect(returnedAuthorIds.has(authorId)).toBe(true);
          }

          // (3) Verify no filter was applied — postModel.find() was called with no arguments
          const findMock = (service as any).postModel.find;
          expect(findMock).toHaveBeenCalledWith();

          // (4) Sorted by createdAt descending
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
});
