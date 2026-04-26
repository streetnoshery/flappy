import * as fc from 'fast-check';
import {
  RewardEngineService,
  EngagementEvent,
  ENGAGER_REWARD,
  OWNER_REWARD,
} from '../reward-engine.service';

/**
 * Property-based tests for RewardEngineService.
 *
 * We construct the service with in-memory mocks for all dependencies,
 * bypassing NestJS DI, following the same pattern as the unit tests.
 *
 * Feature: subscription-rewards
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,12}$/)
  .filter((s) => s.trim().length >= 4);

/** Generate a random post-id-like string */
const arbPostId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,12}$/)
  .filter((s) => s.trim().length >= 4);

/** Arbitrary event type */
const arbEventType: fc.Arbitrary<'like' | 'reaction'> = fc.constantFrom(
  'like' as const,
  'reaction' as const,
);

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  subscribedUsers?: string[];
  abuseCheckResult?: { allowed: boolean; reason?: string };
}

function buildService(deps: MockDeps = {}) {
  const { subscribedUsers = [], abuseCheckResult = { allowed: true } } = deps;

  const balanceUpdates: Array<{ userId: string; amount: number }> = [];
  const createdTransactions: any[] = [];
  const dailyCountUpserts: Array<{
    userId: string;
    date: string;
    inc: number;
  }> = [];

  const subscriptionsService = {
    isSubscribed: jest.fn().mockImplementation((userId: string) => {
      return Promise.resolve(subscribedUsers.includes(userId));
    }),
  };

  const abuseDetectorService = {
    checkEngagement: jest.fn().mockResolvedValue(abuseCheckResult),
  };

  const coinTransactionModel = {
    create: jest.fn().mockImplementation((data: any) => {
      const doc = { ...data, _id: `txn_${createdTransactions.length + 1}` };
      createdTransactions.push(doc);
      return Promise.resolve(doc);
    }),
  };

  const dailyEngagementCountModel = {
    findOneAndUpdate: jest
      .fn()
      .mockImplementation((filter: any, update: any) => {
        dailyCountUpserts.push({
          userId: filter.userId,
          date: filter.date,
          inc: update.$inc?.count ?? 0,
        });
        return Promise.resolve({ userId: filter.userId, count: 1 });
      }),
  };

  const userModel = {
    findOneAndUpdate: jest
      .fn()
      .mockImplementation((filter: any, update: any) => {
        if (update.$inc?.coinBalance !== undefined) {
          balanceUpdates.push({
            userId: filter.userId,
            amount: update.$inc.coinBalance,
          });
        }
        return Promise.resolve({});
      }),
  };

  const service = Object.create(RewardEngineService.prototype);
  Object.assign(service, {
    subscriptionsService,
    abuseDetectorService,
    coinTransactionModel,
    dailyEngagementCountModel,
    userModel,
  });

  return {
    service: service as RewardEngineService,
    mocks: {
      subscriptionsService,
      abuseDetectorService,
      coinTransactionModel,
      dailyEngagementCountModel,
      userModel,
    },
    tracking: {
      balanceUpdates,
      createdTransactions,
      dailyCountUpserts,
    },
  };
}

// ── Property Tests ───────────────────────────────────────────────────

describe('RewardEngineService — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 2.1, 2.2**
   *
   * Feature: subscription-rewards, Property 2: Dual reward on eligible engagement
   *
   * For any two distinct subscribers and any post owned by one of them,
   * when the other subscriber performs an engagement event, both the post
   * owner and the engager SHALL receive the predefined number of coins
   * credited to their balances.
   */
  it('Property 2: Dual reward on eligible engagement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, abuse check passes
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: true },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.processEngagement(event);

          // (1) The engagement should be rewarded
          expect(result.rewarded).toBe(true);

          // (2) Engager receives ENGAGER_REWARD coins
          expect(result.engagerCoins).toBe(ENGAGER_REWARD);

          // (3) Post owner receives OWNER_REWARD coins
          expect(result.ownerCoins).toBe(OWNER_REWARD);

          // (4) Verify balance updates: engager credited ENGAGER_REWARD
          const engagerUpdate = tracking.balanceUpdates.find(
            (u) => u.userId === engagerId,
          );
          expect(engagerUpdate).toBeDefined();
          expect(engagerUpdate!.amount).toBe(ENGAGER_REWARD);

          // (5) Verify balance updates: post owner credited OWNER_REWARD
          const ownerUpdate = tracking.balanceUpdates.find(
            (u) => u.userId === postOwnerId,
          );
          expect(ownerUpdate).toBeDefined();
          expect(ownerUpdate!.amount).toBe(OWNER_REWARD);

          // (6) Exactly two CoinTransaction entries are created
          expect(tracking.createdTransactions).toHaveLength(2);

          // (7) Engager transaction has eventType 'engagement_earned'
          const engagerTxn = tracking.createdTransactions.find(
            (t) => t.userId === engagerId,
          );
          expect(engagerTxn).toBeDefined();
          expect(engagerTxn.eventType).toBe('engagement_earned');
          expect(engagerTxn.amount).toBe(ENGAGER_REWARD);
          expect(engagerTxn.relatedPostId).toBe(postId);
          expect(engagerTxn.relatedUserId).toBe(postOwnerId);

          // (8) Owner transaction has eventType 'engagement_received'
          const ownerTxn = tracking.createdTransactions.find(
            (t) => t.userId === postOwnerId,
          );
          expect(ownerTxn).toBeDefined();
          expect(ownerTxn.eventType).toBe('engagement_received');
          expect(ownerTxn.amount).toBe(OWNER_REWARD);
          expect(ownerTxn.relatedPostId).toBe(postId);
          expect(ownerTxn.relatedUserId).toBe(engagerId);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4, 5.1, 5.2, 6.6**
   *
   * Feature: subscription-rewards, Property 3: Eligibility gate — coins only when both parties are subscribers
   *
   * For any engagement event, coins SHALL be awarded to both parties if and
   * only if the engager is a subscriber AND the post owner is a different
   * subscriber. If either party is not subscribed, or they are the same user,
   * no coin transactions SHALL be created and both balances SHALL remain
   * unchanged.
   */
  it('Property 3: Eligibility gate — coins only when both parties are subscribers', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (
          rawEngagerId,
          rawPostOwnerId,
          postId,
          eventType,
          engagerSubscribed,
          ownerSubscribed,
          forceSelfEngagement,
        ) => {
          // Determine whether this is a self-engagement scenario
          const engagerId = rawEngagerId;
          const postOwnerId = forceSelfEngagement ? rawEngagerId : rawPostOwnerId;

          // Skip ambiguous case where IDs happen to collide but we didn't force it
          if (!forceSelfEngagement) {
            fc.pre(engagerId !== postOwnerId);
          }

          const isSelfEngagement = engagerId === postOwnerId;

          // Build the list of subscribed users based on the booleans
          const subscribedUsers: string[] = [];
          if (engagerSubscribed) subscribedUsers.push(engagerId);
          if (ownerSubscribed && !isSelfEngagement) subscribedUsers.push(postOwnerId);

          // Determine if this engagement should be eligible for rewards:
          // Both must be subscribed AND they must be different users
          const shouldBeRewarded =
            engagerSubscribed && ownerSubscribed && !isSelfEngagement;

          // For self-engagement, the abuse detector blocks it.
          // We configure the abuse check to reflect self-engagement detection.
          const abuseCheckResult = isSelfEngagement
            ? { allowed: false, reason: 'self_engagement' }
            : { allowed: true };

          const { service, tracking } = buildService({
            subscribedUsers,
            abuseCheckResult,
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.processEngagement(event);

          if (shouldBeRewarded) {
            // Both subscribed, different users → coins awarded
            expect(result.rewarded).toBe(true);
            expect(result.engagerCoins).toBe(ENGAGER_REWARD);
            expect(result.ownerCoins).toBe(OWNER_REWARD);
            expect(tracking.createdTransactions).toHaveLength(2);
            expect(tracking.balanceUpdates).toHaveLength(2);
          } else {
            // At least one not subscribed, or self-engagement → no coins
            expect(result.rewarded).toBe(false);
            expect(tracking.createdTransactions).toHaveLength(0);
            expect(tracking.balanceUpdates).toHaveLength(0);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 2.5**
   *
   * Feature: subscription-rewards, Property 4: Engagement reversal restores balances
   *
   * For any rewarded engagement event, reversing that engagement (unlike/unreact)
   * SHALL deduct the previously awarded coins from both the post owner and the
   * engager, returning both balances to their pre-engagement values.
   */
  it('Property 4: Engagement reversal restores balances', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, abuse check passes
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: true },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          // Step 1: Process engagement to award coins
          const engageResult = await service.processEngagement(event);
          expect(engageResult.rewarded).toBe(true);

          // Step 2: Reverse the engagement
          const reverseResult = await service.reverseEngagement(event);
          expect(reverseResult.rewarded).toBe(true);

          // (1) Net balance change for engager is zero across both operations
          const engagerNetBalance = tracking.balanceUpdates
            .filter((u) => u.userId === engagerId)
            .reduce((sum, u) => sum + u.amount, 0);
          expect(engagerNetBalance).toBe(0);

          // (2) Net balance change for post owner is zero across both operations
          const ownerNetBalance = tracking.balanceUpdates
            .filter((u) => u.userId === postOwnerId)
            .reduce((sum, u) => sum + u.amount, 0);
          expect(ownerNetBalance).toBe(0);

          // (3) Reversal transactions have negative amounts
          const reversalTransactions = tracking.createdTransactions.filter(
            (t) => t.eventType === 'engagement_reversed',
          );
          expect(reversalTransactions).toHaveLength(2);
          for (const txn of reversalTransactions) {
            expect(txn.amount).toBeLessThan(0);
          }

          // (4) Engager reversal transaction has correct fields
          const engagerReversal = reversalTransactions.find(
            (t) => t.userId === engagerId,
          );
          expect(engagerReversal).toBeDefined();
          expect(engagerReversal.amount).toBe(-ENGAGER_REWARD);
          expect(engagerReversal.eventType).toBe('engagement_reversed');
          expect(engagerReversal.relatedPostId).toBe(postId);

          // (5) Owner reversal transaction has correct fields
          const ownerReversal = reversalTransactions.find(
            (t) => t.userId === postOwnerId,
          );
          expect(ownerReversal).toBeDefined();
          expect(ownerReversal.amount).toBe(-OWNER_REWARD);
          expect(ownerReversal.eventType).toBe('engagement_reversed');
          expect(ownerReversal.relatedPostId).toBe(postId);

          // (6) Total of 4 transactions: 2 from engagement + 2 from reversal
          expect(tracking.createdTransactions).toHaveLength(4);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 2.6, 3.3**
   *
   * Feature: subscription-rewards, Property 5: Ledger entry completeness
   *
   * For any coin transaction recorded in the Coin Ledger, the entry SHALL
   * contain a valid userId, non-zero amount, eventType from the allowed enum,
   * relatedPostId, and a createdAt timestamp.
   */
  it('Property 5: Ledger entry completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, abuse check passes
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: true },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          await service.processEngagement(event);

          const allowedEventTypes = [
            'engagement_earned',
            'engagement_received',
            'engagement_reversed',
            'conversion',
          ];

          // Verify every created transaction has all required fields
          for (const txn of tracking.createdTransactions) {
            // (1) Non-empty userId
            expect(typeof txn.userId).toBe('string');
            expect(txn.userId.length).toBeGreaterThan(0);

            // (2) Non-zero amount
            expect(txn.amount).not.toBe(0);

            // (3) eventType is in the allowed enum
            expect(allowedEventTypes).toContain(txn.eventType);

            // (4) Non-empty relatedPostId
            expect(typeof txn.relatedPostId).toBe('string');
            expect(txn.relatedPostId.length).toBeGreaterThan(0);
          }

          // (5) At least two transactions were created (engager + owner)
          expect(tracking.createdTransactions.length).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Feature: subscription-rewards, Property 10: Daily rate limit enforcement
   *
   * For any subscriber, after performing the maximum allowed number of rewarded
   * engagement events in a single day, all subsequent engagement events on that
   * same day SHALL be processed as standard interactions without awarding coins.
   */
  it('Property 10: Daily rate limit enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, but abuse detector returns rate_limit
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: false, reason: 'rate_limit' },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.processEngagement(event);

          // (1) No coins awarded
          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('rate_limit');

          // (2) No transactions created
          expect(tracking.createdTransactions).toHaveLength(0);

          // (3) No balance updates
          expect(tracking.balanceUpdates).toHaveLength(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 6.3**
   *
   * Feature: subscription-rewards, Property 11: Duplicate engagement prevention
   *
   * For any subscriber and any post, the second engagement event on the same
   * post SHALL not award coins.
   */
  it('Property 11: Duplicate engagement prevention', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, but abuse detector returns duplicate
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: false, reason: 'duplicate' },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.processEngagement(event);

          // (1) No coins awarded
          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('duplicate');

          // (2) No transactions created
          expect(tracking.createdTransactions).toHaveLength(0);

          // (3) No balance updates
          expect(tracking.balanceUpdates).toHaveLength(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 6.5**
   *
   * Feature: subscription-rewards, Property 12: Flagged account suspension
   *
   * For any account flagged by the Abuse Detector, all subsequent engagement
   * events SHALL not award coins until the flag is resolved.
   */
  it('Property 12: Flagged account suspension', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          // Pre-condition: engager and post owner must be distinct
          fc.pre(engagerId !== postOwnerId);

          // Both users are subscribers, but abuse detector returns flagged
          const { service, tracking } = buildService({
            subscribedUsers: [engagerId, postOwnerId],
            abuseCheckResult: { allowed: false, reason: 'flagged' },
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.processEngagement(event);

          // (1) No coins awarded
          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('flagged');

          // (2) No transactions created
          expect(tracking.createdTransactions).toHaveLength(0);

          // (3) No balance updates
          expect(tracking.balanceUpdates).toHaveLength(0);
        },
      ),
      { numRuns: 20 },
    );
  });
});
