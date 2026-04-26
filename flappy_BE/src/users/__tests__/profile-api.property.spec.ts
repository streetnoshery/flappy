import * as fc from 'fast-check';
import { UsersService } from '../users.service';

/**
 * Property-based tests for Profile API subscription fields completeness.
 *
 * We construct a UsersService with an in-memory mock for the User Mongoose model,
 * bypassing NestJS DI, following the same pattern established in
 * flappy_BE/src/feed/__tests__/enrichment.property.spec.ts and
 * flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts.
 *
 * Feature: subscription-rewards
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string (UUID-like, not a MongoDB ObjectId) */
const arbUserId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9]{3,11}$/)
  .filter((s) => s.trim().length >= 4 && !/^[0-9a-fA-F]{24}$/.test(s));

/** Arbitrary coin balance (non-negative integer) */
const arbCoinBalance: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100000 });

/** Arbitrary subscribedAt date or undefined */
const arbSubscribedAt: fc.Arbitrary<Date | undefined> = fc.option(
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  { nil: undefined },
);

// ── Mock factory ─────────────────────────────────────────────────────

interface UserDoc {
  userId: string;
  username: string;
  email: string;
  password: string;
  isSubscribed: boolean;
  subscribedAt?: Date;
  coinBalance: number;
  rewardsSuspended: boolean;
}

function buildService(userDoc: UserDoc) {
  const userObj = { ...userDoc };

  const mockUserModel = {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockImplementation((_filter: any) => ({
      select: jest.fn().mockResolvedValue({
        ...userObj,
        _id: { toString: () => `mongo_${userDoc.userId}` },
        toObject: () => ({ ...userObj }),
      }),
    })),
  };

  const service = Object.create(UsersService.prototype);
  Object.assign(service, {
    userModel: mockUserModel,
  });

  return {
    service: service as UsersService,
    mocks: { userModel: mockUserModel },
  };
}

// ── Property Tests ───────────────────────────────────────────────────

describe('Profile API — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * Feature: subscription-rewards, Property 13: Profile API subscription fields completeness
   *
   * For any user profile API response, the response SHALL include `isSubscribed`
   * (boolean) and `subscribedAt` (date or null). When the requesting user is
   * viewing their own profile, the response SHALL additionally include `coinBalance`.
   */
  it('Property 13: Profile API subscription fields completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.boolean(),
        arbSubscribedAt,
        arbCoinBalance,
        arbUserId,
        fc.boolean(),
        async (
          profileUserId,
          isSubscribed,
          subscribedAt,
          coinBalance,
          viewerBaseId,
          isOwnProfile,
        ) => {
          // Determine the viewerId: either the same user (own profile) or a different user
          const viewerId = isOwnProfile ? profileUserId : viewerBaseId;

          // Ensure distinct users when not own profile
          if (!isOwnProfile) {
            fc.pre(viewerId !== profileUserId);
          }

          const userDoc: UserDoc = {
            userId: profileUserId,
            username: `user_${profileUserId}`,
            email: `${profileUserId}@test.com`,
            password: 'hashed_password',
            isSubscribed,
            subscribedAt: isSubscribed ? (subscribedAt ?? new Date()) : subscribedAt,
            coinBalance,
            rewardsSuspended: false,
          };

          const { service } = buildService(userDoc);

          const result = await service.findById(profileUserId, viewerId);

          // ── Requirement 7.3: isSubscribed boolean is always present ──
          expect(result).toHaveProperty('isSubscribed');
          expect(typeof result.isSubscribed).toBe('boolean');
          expect(result.isSubscribed).toBe(isSubscribed);

          // ── Requirement 7.1: subscribedAt is always present (date or null) ──
          expect(result).toHaveProperty('subscribedAt');
          if (userDoc.subscribedAt != null) {
            expect(result.subscribedAt).toEqual(userDoc.subscribedAt);
          } else {
            expect(result.subscribedAt).toBeNull();
          }

          // ── Requirement 7.2: coinBalance included only for own profile ──
          if (isOwnProfile) {
            expect(result).toHaveProperty('coinBalance');
            expect(result.coinBalance).toBe(coinBalance);
          } else {
            expect(result).not.toHaveProperty('coinBalance');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
