import { BadRequestException } from '@nestjs/common';
import { FeedController } from '../feed.controller';
import { FeedService } from '../feed.service';

/**
 * Unit tests for Following feed edge cases.
 *
 * Uses the same mock patterns established in the property test file.
 * Tests controller validation logic and service edge cases.
 *
 * Validates: Requirements 1.6, 1.7
 */

// ── Mock factory (same pattern as property tests) ────────────────────

function buildMockService(overrides: Partial<FeedService> = {}): FeedService {
  const service = Object.create(FeedService.prototype);
  Object.assign(service, {
    getFollowingFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getHomeFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getReelsFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    getExploreFeed: jest.fn().mockResolvedValue({ posts: [], page: 1, hasMore: false }),
    ...overrides,
  });
  return service as FeedService;
}

function buildMockFeedService(deps: {
  followingIds: string[];
  allPosts: any[];
}): FeedService {
  const { allPosts, followingIds } = deps;

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

  const reactionModel = {
    aggregate: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  const commentModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const bookmarkModel = {
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  };

  const likeModel = {};

  const followCacheService = {
    getFollowingIds: jest.fn().mockReturnValue(followingIds),
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

function buildController(service: FeedService): FeedController {
  const controller = Object.create(FeedController.prototype);
  Object.assign(controller, { feedService: service });
  return controller as FeedController;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Following Feed — Unit Tests', () => {
  describe('Controller: userId validation (Requirement 1.6)', () => {
    it('should throw BadRequestException when userId is undefined', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await expect(controller.getFollowingFeed(1, undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.getFollowingFeed).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when userId is an empty string', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await expect(controller.getFollowingFeed(1, '')).rejects.toThrow(
        BadRequestException,
      );
      expect(service.getFollowingFeed).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when userId is whitespace only', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await expect(controller.getFollowingFeed(1, '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(service.getFollowingFeed).not.toHaveBeenCalled();
    });

    it('should include descriptive error message in the 400 response', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await expect(controller.getFollowingFeed(1, undefined)).rejects.toThrow(
        'userId query parameter is required',
      );
    });
  });

  describe('Service: empty follow list (Requirement 1.7)', () => {
    it('should return empty posts array with hasMore false when user follows nobody', async () => {
      const service = buildMockFeedService({
        followingIds: [],
        allPosts: [
          {
            _id: { toString: () => 'post1' },
            userId: 'other-user',
            content: 'Hello',
            type: 'text',
            hashtags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.getFollowingFeed(1, 'lonely-user');

      expect(result.posts).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.page).toBe(1);
    });

    it('should not query the database when follow list is empty', async () => {
      const service = buildMockFeedService({
        followingIds: [],
        allPosts: [],
      });

      await service.getFollowingFeed(1, 'lonely-user');

      // postModel.find should NOT be called when followingIds is empty
      expect((service as any).postModel.find).not.toHaveBeenCalled();
    });
  });

  describe('Controller: delegation to service', () => {
    it('should delegate to feedService.getFollowingFeed with correct arguments', async () => {
      const mockResult = {
        posts: [{ _id: 'p1', content: 'test post' }],
        page: 2,
        hasMore: true,
      };
      const service = buildMockService({
        getFollowingFeed: jest.fn().mockResolvedValue(mockResult),
      });
      const controller = buildController(service);

      const result = await controller.getFollowingFeed(2, 'user-123');

      expect(service.getFollowingFeed).toHaveBeenCalledWith(2, 'user-123');
      expect(result).toEqual(mockResult);
    });

    it('should use default page 1 when page is not provided', async () => {
      const service = buildMockService();
      const controller = buildController(service);

      await controller.getFollowingFeed(1, 'user-123');

      expect(service.getFollowingFeed).toHaveBeenCalledWith(1, 'user-123');
    });

    it('should propagate service errors to the caller', async () => {
      const service = buildMockService({
        getFollowingFeed: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      });
      const controller = buildController(service);

      await expect(controller.getFollowingFeed(1, 'user-123')).rejects.toThrow(
        'DB connection failed',
      );
    });
  });
});
