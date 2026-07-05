import * as fc from 'fast-check';
import {
  RewardEngineService,
  EngagementEvent,
  OWNER_REWARD,
  COIN_THRESHOLD,
} from '../reward-engine.service';

/**
 * Property-based tests for RewardEngineService.
 *
 * Reward rule: only the post owner receives coins. The engaging user does not.
 *
 * Feature: subscription-rewards
 */

// ── Helpers ──────────────────────────────────────────────────────────

const arbUserId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,12}$/)
  .filter((s) => s.trim().length >= 4);

const arbPostId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,12}$/)
  .filter((s) => s.trim().length >= 4);

const arbEventType: fc.Arbitrary<'like' | 'reaction'> = fc.constantFrom(
  'like' as const,
  'reaction' as const,
);

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  subscribedUsers?: string[];
  abuseCheckResult?: { allowed: boolean; reason?: string };
  /** Initial coinBalance returned from PostCoinLedger upsert (default: OWNER_REWARD) */
  initialLedgerBalance?: number;
  /** Whether the PostCoinLedger record is already converted */
  ledgerConverted?: boolean;
}

function buildService(deps: MockDeps = {}) {
  const {
    subscribedUsers = [],
    abuseCheckResult = { allowed: true },
    initialLedgerBalance = OWNER_REWARD,
    ledgerConverted = false,
  } = deps;

  /**
   * balanceUpdates tracks every $inc applied to PostCoinLedger.coinBalance,
   * keyed by ownerId (the post owner). This mirrors the old userModel tracking
   * so existing property assertions remain valid.
   */
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

  // PostCoinLedger mock — tracks $inc upserts and $set threshold updates
  const postCoinLedgerModel = {
    findOneAndUpdate: jest
      .fn()
      .mockImplementation((filter: any, update: any, _options?: any) => {
        if (update.$inc?.coinBalance !== undefined) {
          // Record as a balance update keyed by ownerId
          balanceUpdates.push({
            userId: filter.ownerId,
            amount: update.$inc.coinBalance,
          });
          return Promise.resolve({
            postId: filter.postId,
            ownerId: filter.ownerId,
            coinBalance: initialLedgerBalance,
            thresholdReached: false,
            converted: ledgerConverted,
          });
        }
        // $set call (threshold flag update)
        return Promise.resolve({
          postId: filter.postId,
          ownerId: filter.ownerId,
          coinBalance: initialLedgerBalance,
          thresholdReached: true,
        });
      }),
    findOne: jest.fn().mockImplementation((filter: any) => {
      return Promise.resolve(
        ledgerConverted
          ? { postId: filter.postId, ownerId: filter.ownerId, converted: true, thresholdReached: false }
          : null,
      );
    }),
  };

  const service = Object.create(RewardEngineService.prototype);
  Object.assign(service, {
    subscriptionsService,
    abuseDetectorService,
    coinTransactionModel,
    dailyEngagementCountModel,
    postCoinLedgerModel,
  });

  return {
    service: service as RewardEngineService,
    mocks: {
      subscriptionsService,
      abuseDetectorService,
      coinTransactionModel,
      dailyEngagementCountModel,
      postCoinLedgerModel,
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
   * **Validates: Requirements 2.1**
   *
   * Feature: subscription-rewards, Property 2: Post owner reward on eligible engagement
   *
   * For any two distinct subscribers and any post owned by one of them,
   * when the other subscriber performs an engagement event, only the post
   * owner SHALL receive the predefined number of coins. The engager gets nothing.
   */
  it('Property 2: Post owner reward on eligible engagement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          // (2) Engager receives 0 coins
          expect(result.engagerCoins).toBe(0);

          // (3) Post owner receives OWNER_REWARD coins
          expect(result.ownerCoins).toBe(OWNER_REWARD);

          // (4) Only post owner gets a balance update
          expect(tracking.balanceUpdates).toHaveLength(1);
          const ownerUpdate = tracking.balanceUpdates[0];
          expect(ownerUpdate.userId).toBe(postOwnerId);
          expect(ownerUpdate.amount).toBe(OWNER_REWARD);

          // (5) Exactly one CoinTransaction entry is created (post owner only)
          expect(tracking.createdTransactions).toHaveLength(1);

          // (6) Owner transaction has eventType 'engagement_received'
          const ownerTxn = tracking.createdTransactions[0];
          expect(ownerTxn.userId).toBe(postOwnerId);
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
   * Feature: subscription-rewards, Property 3: Eligibility gate
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
          const engagerId = rawEngagerId;
          const postOwnerId = forceSelfEngagement ? rawEngagerId : rawPostOwnerId;

          if (!forceSelfEngagement) {
            fc.pre(engagerId !== postOwnerId);
          }

          const isSelfEngagement = engagerId === postOwnerId;

          const subscribedUsers: string[] = [];
          if (engagerSubscribed) subscribedUsers.push(engagerId);
          if (ownerSubscribed && !isSelfEngagement) subscribedUsers.push(postOwnerId);

          const shouldBeRewarded =
            engagerSubscribed && ownerSubscribed && !isSelfEngagement;

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
            expect(result.rewarded).toBe(true);
            expect(result.engagerCoins).toBe(0);
            expect(result.ownerCoins).toBe(OWNER_REWARD);
            expect(tracking.createdTransactions).toHaveLength(1);
            expect(tracking.balanceUpdates).toHaveLength(1);
          } else {
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
   */
  it('Property 4: Engagement reversal restores balances', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          // Step 1: Process engagement
          const engageResult = await service.processEngagement(event);
          expect(engageResult.rewarded).toBe(true);

          // Step 2: Reverse the engagement
          const reverseResult = await service.reverseEngagement(event);
          expect(reverseResult.rewarded).toBe(true);

          // (1) Net balance change for post owner is zero
          const ownerNetBalance = tracking.balanceUpdates
            .filter((u) => u.userId === postOwnerId)
            .reduce((sum, u) => sum + u.amount, 0);
          expect(ownerNetBalance).toBe(0);

          // (2) Engager never had any balance changes
          const engagerUpdates = tracking.balanceUpdates.filter(
            (u) => u.userId === engagerId,
          );
          expect(engagerUpdates).toHaveLength(0);

          // (3) Reversal transaction has negative amount
          const reversalTransactions = tracking.createdTransactions.filter(
            (t) => t.eventType === 'engagement_reversed',
          );
          expect(reversalTransactions).toHaveLength(1);
          expect(reversalTransactions[0].amount).toBe(-OWNER_REWARD);

          // (4) Owner reversal transaction has correct fields
          const ownerReversal = reversalTransactions[0];
          expect(ownerReversal.userId).toBe(postOwnerId);
          expect(ownerReversal.eventType).toBe('engagement_reversed');
          expect(ownerReversal.relatedPostId).toBe(postId);

          // (5) Total of 2 transactions: 1 from engagement + 1 from reversal
          expect(tracking.createdTransactions).toHaveLength(2);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 2.6, 3.3**
   *
   * Feature: subscription-rewards, Property 5: Ledger entry completeness
   */
  it('Property 5: Ledger entry completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          for (const txn of tracking.createdTransactions) {
            expect(typeof txn.userId).toBe('string');
            expect(txn.userId.length).toBeGreaterThan(0);
            expect(txn.amount).not.toBe(0);
            expect(allowedEventTypes).toContain(txn.eventType);
            expect(typeof txn.relatedPostId).toBe('string');
            expect(txn.relatedPostId.length).toBeGreaterThan(0);
          }

          // Only one transaction (post owner)
          expect(tracking.createdTransactions).toHaveLength(1);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Feature: subscription-rewards, Property 10: Daily rate limit enforcement
   */
  it('Property 10: Daily rate limit enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('rate_limit');
          expect(tracking.createdTransactions).toHaveLength(0);
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
   */
  it('Property 11: Duplicate engagement prevention', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('duplicate');
          expect(tracking.createdTransactions).toHaveLength(0);
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
   */
  it('Property 12: Flagged account suspension', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('flagged');
          expect(tracking.createdTransactions).toHaveLength(0);
          expect(tracking.balanceUpdates).toHaveLength(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  // ── Per-Post Coin Rewards Properties ─────────────────────────────────

  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * Feature: per-post-coin-rewards, Property 1: Per-post coin balance grows by exactly OWNER_REWARD on each eligible engagement
   *
   * For any eligible engagement (both parties subscribed, abuse check passes, distinct users),
   * the PostCoinLedger upsert $inc amount SHALL equal exactly OWNER_REWARD.
   */
  it('Property 1: Per-post coin balance grows by exactly OWNER_REWARD on each eligible engagement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          expect(result.rewarded).toBe(true);

          // The $inc applied to PostCoinLedger.coinBalance must equal exactly OWNER_REWARD
          expect(tracking.balanceUpdates).toHaveLength(1);
          expect(tracking.balanceUpdates[0].amount).toBe(OWNER_REWARD);
          expect(tracking.balanceUpdates[0].userId).toBe(postOwnerId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.3, 1.4, 2.1, 2.2**
   *
   * Feature: per-post-coin-rewards, Property 2: Threshold flag is set if and only if coinBalance >= 1000
   *
   * Generate arbitrary coinBalance values (0–2000) and simulate the threshold-check logic;
   * assert thresholdReached is set to true iff coinBalance >= COIN_THRESHOLD.
   */
  it('Property 2: Threshold flag is set if and only if coinBalance >= 1000', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        fc.integer({ min: 0, max: 2000 }),
        async (engagerId, postOwnerId, postId, eventType, simulatedBalance) => {
          fc.pre(engagerId !== postOwnerId);

          // Build a service where the $inc returns simulatedBalance as the new coinBalance
          const ledgerSets: Array<{ filter: any; update: any }> = [];
          const createdTransactions: any[] = [];

          const postCoinLedgerModel = {
            findOneAndUpdate: jest
              .fn()
              .mockImplementation((filter: any, update: any, _options?: any) => {
                if (update.$inc !== undefined) {
                  return Promise.resolve({
                    postId: filter.postId,
                    ownerId: filter.ownerId,
                    coinBalance: simulatedBalance,
                    thresholdReached: false,
                    converted: false,
                  });
                } else if (update.$set !== undefined) {
                  ledgerSets.push({ filter, update });
                  return Promise.resolve({
                    postId: filter.postId,
                    ownerId: filter.ownerId,
                    coinBalance: simulatedBalance,
                    thresholdReached: true,
                  });
                }
                return Promise.resolve(null);
              }),
            findOne: jest.fn().mockResolvedValue(null),
          };

          const coinTransactionModel = {
            create: jest.fn().mockImplementation((data: any) => {
              const doc = { ...data, _id: `txn_${createdTransactions.length + 1}` };
              createdTransactions.push(doc);
              return Promise.resolve(doc);
            }),
          };

          const dailyEngagementCountModel = {
            findOneAndUpdate: jest.fn().mockResolvedValue({ count: 1 }),
          };

          const subscriptionsService = {
            isSubscribed: jest.fn().mockResolvedValue(true),
          };

          const abuseDetectorService = {
            checkEngagement: jest.fn().mockResolvedValue({ allowed: true }),
          };

          const service = Object.create(RewardEngineService.prototype);
          Object.assign(service, {
            subscriptionsService,
            abuseDetectorService,
            coinTransactionModel,
            dailyEngagementCountModel,
            postCoinLedgerModel,
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await (service as RewardEngineService).processEngagement(event);

          // The previous balance is simulatedBalance - OWNER_REWARD
          const previousBalance = simulatedBalance - OWNER_REWARD;
          const thresholdJustCrossed =
            simulatedBalance >= COIN_THRESHOLD && previousBalance < COIN_THRESHOLD;

          if (thresholdJustCrossed) {
            // thresholdReached should have been set to true
            expect(result.thresholdJustReached).toBe(true);
            expect(ledgerSets.some((s) => s.update.$set?.thresholdReached === true)).toBe(true);
          } else {
            // thresholdReached should NOT have been set to true in this call
            expect(result.thresholdJustReached).toBe(false);
            expect(ledgerSets.some((s) => s.update.$set?.thresholdReached === true)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.4**
   *
   * Feature: per-post-coin-rewards, Property 3: Engagement reversal is the exact inverse of engagement processing
   *
   * For any eligible engagement followed by its reversal, the net $inc sum applied to
   * PostCoinLedger.coinBalance SHALL be zero.
   */
  it('Property 3: Engagement reversal is the exact inverse of engagement processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          // Process engagement then reverse it
          const engageResult = await service.processEngagement(event);
          expect(engageResult.rewarded).toBe(true);

          const reverseResult = await service.reverseEngagement(event);
          expect(reverseResult.rewarded).toBe(true);

          // Net $inc sum for the post owner's PostCoinLedger must be zero
          const netBalance = tracking.balanceUpdates
            .filter((u) => u.userId === postOwnerId)
            .reduce((sum, u) => sum + u.amount, 0);

          expect(netBalance).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Feature: per-post-coin-rewards, Property 5: CoinTransaction records are complete and well-formed
   *
   * For any eligible engagement, every created CoinTransaction SHALL have non-empty userId,
   * non-zero amount (except post_threshold_reached), valid eventType (including post_threshold_reached),
   * non-empty relatedPostId, and a numeric postCoinBalanceAfter.
   */
  it('Property 5: CoinTransaction records are complete and well-formed', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

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

          const validEventTypes = [
            'engagement_earned',
            'engagement_received',
            'engagement_reversed',
            'conversion',
            'post_threshold_reached',
          ];

          for (const txn of tracking.createdTransactions) {
            // userId must be non-empty
            expect(typeof txn.userId).toBe('string');
            expect(txn.userId.length).toBeGreaterThan(0);

            // amount: post_threshold_reached may be 0, all others must be non-zero
            if (txn.eventType !== 'post_threshold_reached') {
              expect(txn.amount).not.toBe(0);
            }

            // eventType must be valid (including post_threshold_reached)
            expect(validEventTypes).toContain(txn.eventType);

            // relatedPostId must be non-empty
            expect(typeof txn.relatedPostId).toBe('string');
            expect(txn.relatedPostId.length).toBeGreaterThan(0);

            // postCoinBalanceAfter must be a number
            expect(typeof txn.postCoinBalanceAfter).toBe('number');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.5**
   *
   * Feature: per-post-coin-rewards, Property 7: Reversal on a converted post is rejected
   *
   * For any post where PostCoinLedger.converted = true, any reversal attempt SHALL return
   * { rewarded: false, reason: 'already_converted' } and SHALL NOT call
   * postCoinLedgerModel.findOneAndUpdate with a $inc operation.
   */
  it('Property 7: Reversal on a converted post is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        arbUserId,
        arbPostId,
        arbEventType,
        async (engagerId, postOwnerId, postId, eventType) => {
          fc.pre(engagerId !== postOwnerId);

          const { service, tracking, mocks } = buildService({
            ledgerConverted: true,
          });

          const event: EngagementEvent = {
            engagerId,
            postId,
            postOwnerId,
            eventType,
          };

          const result = await service.reverseEngagement(event);

          // Must return already_converted
          expect(result.rewarded).toBe(false);
          expect(result.reason).toBe('already_converted');

          // No $inc calls should have been made on PostCoinLedger
          expect(tracking.balanceUpdates).toHaveLength(0);

          // Verify findOneAndUpdate was NOT called with $inc
          const findOneAndUpdateCalls = mocks.postCoinLedgerModel.findOneAndUpdate.mock.calls;
          const incCalls = findOneAndUpdateCalls.filter(
            (call: any[]) => call[1]?.$inc !== undefined,
          );
          expect(incCalls).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
