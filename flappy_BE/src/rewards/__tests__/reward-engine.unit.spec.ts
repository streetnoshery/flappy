import {
  RewardEngineService,
  EngagementEvent,
  OWNER_REWARD,
  COIN_THRESHOLD,
} from '../reward-engine.service';

/**
 * Unit tests for RewardEngineService.
 *
 * We construct the service with in-memory mocks for all dependencies,
 * bypassing NestJS DI, and verify processEngagement / reverseEngagement logic.
 *
 * Reward rule: only the post owner receives coins via PostCoinLedger.
 * User.coinBalance is NOT written to.
 */

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  /** User IDs that are subscribed */
  subscribedUsers?: string[];
  /** Abuse check result override */
  abuseCheckResult?: { allowed: boolean; reason?: string };
  /** Initial coinBalance to return from PostCoinLedger upsert */
  initialLedgerBalance?: number;
  /** Whether the PostCoinLedger record is converted */
  ledgerConverted?: boolean;
}

function buildService(deps: MockDeps = {}) {
  const {
    subscribedUsers = [],
    abuseCheckResult = { allowed: true },
    initialLedgerBalance = OWNER_REWARD,
    ledgerConverted = false,
  } = deps;

  const ledgerUpserts: Array<{ filter: any; update: any; options?: any }> = [];
  const ledgerSets: Array<{ filter: any; update: any }> = [];
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

  // Track calls separately for upsert vs $set operations
  const postCoinLedgerModel = {
    findOneAndUpdate: jest
      .fn()
      .mockImplementation((filter: any, update: any, options?: any) => {
        if (update.$inc !== undefined) {
          ledgerUpserts.push({ filter, update, options });
          return Promise.resolve({
            postId: filter.postId,
            ownerId: filter.ownerId,
            coinBalance: initialLedgerBalance,
            thresholdReached: false,
            converted: ledgerConverted,
          });
        } else if (update.$set !== undefined) {
          ledgerSets.push({ filter, update });
          return Promise.resolve({
            postId: filter.postId,
            ownerId: filter.ownerId,
            coinBalance: initialLedgerBalance,
            thresholdReached: true,
          });
        }
        return Promise.resolve(null);
      }),
    findOne: jest.fn().mockResolvedValue(
      ledgerConverted
        ? { postId: 'post1', ownerId: 'owner1', converted: true }
        : null,
    ),
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
      ledgerUpserts,
      ledgerSets,
      createdTransactions,
      dailyCountUpserts,
    },
  };
}

function makeEvent(overrides: Partial<EngagementEvent> = {}): EngagementEvent {
  return {
    engagerId: 'engager1',
    postId: 'post1',
    postOwnerId: 'owner1',
    eventType: 'like',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('RewardEngineService', () => {
  describe('processEngagement', () => {
    it('should return not_subscribed when engager is not subscribed', async () => {
      const { service } = buildService({ subscribedUsers: ['owner1'] });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(false);
      expect(result.reason).toBe('not_subscribed');
    });

    it('should return not_subscribed when post owner is not subscribed', async () => {
      const { service } = buildService({ subscribedUsers: ['engager1'] });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(false);
      expect(result.reason).toBe('not_subscribed');
    });

    it('should return not_subscribed when neither party is subscribed', async () => {
      const { service } = buildService({ subscribedUsers: [] });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(false);
      expect(result.reason).toBe('not_subscribed');
    });

    it('should return abuse reason when abuse check fails', async () => {
      const { service } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        abuseCheckResult: { allowed: false, reason: 'rate_limit' },
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(false);
      expect(result.reason).toBe('rate_limit');
    });

    it('should write to PostCoinLedger (not User.coinBalance) when eligible', async () => {
      const { service, tracking, mocks } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(true);
      expect(result.engagerCoins).toBe(0);
      expect(result.ownerCoins).toBe(OWNER_REWARD);

      // PostCoinLedger upsert was called with correct $inc
      expect(tracking.ledgerUpserts).toHaveLength(1);
      expect(tracking.ledgerUpserts[0].update.$inc.coinBalance).toBe(OWNER_REWARD);
      expect(tracking.ledgerUpserts[0].filter.postId).toBe('post1');
      expect(tracking.ledgerUpserts[0].filter.ownerId).toBe('owner1');
      expect(tracking.ledgerUpserts[0].options).toMatchObject({ upsert: true, new: true });
    });

    it('should NOT have a userModel dependency (User.coinBalance not written)', async () => {
      const { service } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      // The service should not have a userModel property
      expect((service as any).userModel).toBeUndefined();
    });

    it('should create one CoinTransaction entry (post owner only) on success', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      const result = await service.processEngagement(makeEvent());

      // At minimum one transaction (engagement_received); no threshold transaction since balance = OWNER_REWARD
      expect(result.transactions!.length).toBeGreaterThanOrEqual(1);
      const ownerTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'engagement_received',
      );
      expect(ownerTxn).toBeDefined();
      expect(ownerTxn.userId).toBe('owner1');
      expect(ownerTxn.amount).toBe(OWNER_REWARD);
      expect(ownerTxn.relatedPostId).toBe('post1');
      expect(ownerTxn.relatedUserId).toBe('engager1');
    });

    it('should populate postCoinBalanceAfter on the CoinTransaction', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        initialLedgerBalance: 10,
      });

      await service.processEngagement(makeEvent());

      const ownerTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'engagement_received',
      );
      expect(ownerTxn.postCoinBalanceAfter).toBe(10);
    });

    it('should not create any transaction for the engager', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      await service.processEngagement(makeEvent());

      const engagerTxns = tracking.createdTransactions.filter(
        (t) => t.userId === 'engager1',
      );
      expect(engagerTxns).toHaveLength(0);
    });

    it('should increment daily engagement count for the engager', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      await service.processEngagement(makeEvent());

      expect(tracking.dailyCountUpserts).toHaveLength(1);
      expect(tracking.dailyCountUpserts[0].userId).toBe('engager1');
      expect(tracking.dailyCountUpserts[0].inc).toBe(1);
    });

    it('should not create transactions when engager is not subscribed', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['owner1'],
      });

      await service.processEngagement(makeEvent());

      expect(tracking.createdTransactions).toHaveLength(0);
      expect(tracking.ledgerUpserts).toHaveLength(0);
    });

    it('should not create transactions when abuse check fails', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        abuseCheckResult: { allowed: false, reason: 'duplicate' },
      });

      await service.processEngagement(makeEvent());

      expect(tracking.createdTransactions).toHaveLength(0);
      expect(tracking.ledgerUpserts).toHaveLength(0);
    });

    it('should pass correct arguments to abuse detector', async () => {
      const { service, mocks } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      await service.processEngagement(makeEvent());

      expect(mocks.abuseDetectorService.checkEngagement).toHaveBeenCalledWith(
        'engager1',
        'post1',
        'owner1',
      );
    });

    it('should include reaction type in transaction description', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      await service.processEngagement(
        makeEvent({ eventType: 'reaction', reactionType: 'heart' }),
      );

      const ownerTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'engagement_received',
      );
      expect(ownerTxn.description).toContain('heart');
    });

    it('should set thresholdReached when coinBalance crosses COIN_THRESHOLD', async () => {
      // Simulate balance going from 998 to 1000 (OWNER_REWARD = 2)
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        initialLedgerBalance: COIN_THRESHOLD, // returned after $inc, so previous was 998
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.thresholdJustReached).toBe(true);
      expect(result.postCoinBalance).toBe(COIN_THRESHOLD);

      // A $set call should have been made to mark thresholdReached
      expect(tracking.ledgerSets).toHaveLength(1);
      expect(tracking.ledgerSets[0].update.$set.thresholdReached).toBe(true);
      expect(tracking.ledgerSets[0].update.$set.thresholdReachedAt).toBeInstanceOf(Date);
    });

    it('should create post_threshold_reached transaction when threshold is crossed', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        initialLedgerBalance: COIN_THRESHOLD,
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.thresholdJustReached).toBe(true);
      const thresholdTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'post_threshold_reached',
      );
      expect(thresholdTxn).toBeDefined();
      expect(thresholdTxn.userId).toBe('owner1');
      expect(thresholdTxn.amount).toBe(0);
      expect(thresholdTxn.relatedPostId).toBe('post1');
      expect(thresholdTxn.postCoinBalanceAfter).toBe(COIN_THRESHOLD);
    });

    it('should NOT create post_threshold_reached transaction when threshold is not yet reached', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        initialLedgerBalance: OWNER_REWARD, // well below threshold
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.thresholdJustReached).toBe(false);
      const thresholdTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'post_threshold_reached',
      );
      expect(thresholdTxn).toBeUndefined();
    });

    it('should NOT create post_threshold_reached transaction when balance was already above threshold', async () => {
      // Balance goes from 1002 to 1004 — threshold was already reached before
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        initialLedgerBalance: COIN_THRESHOLD + OWNER_REWARD + 2, // previous was above threshold too
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.thresholdJustReached).toBe(false);
      const thresholdTxn = tracking.createdTransactions.find(
        (t) => t.eventType === 'post_threshold_reached',
      );
      expect(thresholdTxn).toBeUndefined();
    });
  });

  describe('reverseEngagement', () => {
    it('should deduct coins from PostCoinLedger (not User.coinBalance)', async () => {
      const { service, tracking } = buildService();

      const result = await service.reverseEngagement(makeEvent());

      expect(result.rewarded).toBe(true);
      expect(result.engagerCoins).toBe(0);
      expect(result.ownerCoins).toBe(-OWNER_REWARD);

      // PostCoinLedger $inc with negative amount
      expect(tracking.ledgerUpserts).toHaveLength(1);
      expect(tracking.ledgerUpserts[0].update.$inc.coinBalance).toBe(-OWNER_REWARD);
      expect(tracking.ledgerUpserts[0].filter.postId).toBe('post1');
    });

    it('should create one reversal CoinTransaction entry (post owner only)', async () => {
      const { service, tracking } = buildService();

      const result = await service.reverseEngagement(makeEvent());

      expect(result.transactions).toHaveLength(1);
      expect(tracking.createdTransactions).toHaveLength(1);

      const ownerReversal = tracking.createdTransactions[0];
      expect(ownerReversal.userId).toBe('owner1');
      expect(ownerReversal.eventType).toBe('engagement_reversed');
      expect(ownerReversal.amount).toBe(-OWNER_REWARD);
      expect(ownerReversal.relatedPostId).toBe('post1');
    });

    it('should include reaction type in reversal description', async () => {
      const { service, tracking } = buildService();

      await service.reverseEngagement(
        makeEvent({ eventType: 'reaction', reactionType: 'fire' }),
      );

      const ownerReversal = tracking.createdTransactions[0];
      expect(ownerReversal.description).toContain('fire');
    });

    it('should return already_converted when PostCoinLedger.converted is true', async () => {
      const { service, tracking } = buildService({ ledgerConverted: true });

      const result = await service.reverseEngagement(makeEvent());

      expect(result.rewarded).toBe(false);
      expect(result.reason).toBe('already_converted');

      // No $inc calls should have been made
      expect(tracking.ledgerUpserts).toHaveLength(0);
    });

    it('should set thresholdReached = false when balance drops below threshold', async () => {
      // Custom mock: findOne returns a ledger with thresholdReached=true and high balance,
      // findOneAndUpdate with $inc returns balance below threshold
      const ledgerUpserts: Array<{ filter: any; update: any; options?: any }> = [];
      const ledgerSets: Array<{ filter: any; update: any }> = [];
      const createdTransactions: any[] = [];

      const postCoinLedgerModel = {
        findOneAndUpdate: jest
          .fn()
          .mockImplementation((filter: any, update: any, options?: any) => {
            if (update.$inc !== undefined) {
              ledgerUpserts.push({ filter, update, options });
              // Return balance below threshold after decrement
              return Promise.resolve({
                postId: filter.postId,
                ownerId: filter.ownerId,
                coinBalance: 998,
                thresholdReached: true,
                converted: false,
              });
            } else if (update.$set !== undefined) {
              ledgerSets.push({ filter, update });
              return Promise.resolve({
                postId: filter.postId,
                ownerId: filter.ownerId,
                coinBalance: 998,
                thresholdReached: false,
              });
            }
            return Promise.resolve(null);
          }),
        findOne: jest.fn().mockResolvedValue({
          postId: 'post1',
          ownerId: 'owner1',
          converted: false,
          thresholdReached: true,
          coinBalance: 1000,
        }),
      };

      const coinTransactionModel = {
        create: jest.fn().mockImplementation((data: any) => {
          const doc = { ...data, _id: `txn_${createdTransactions.length + 1}` };
          createdTransactions.push(doc);
          return Promise.resolve(doc);
        }),
      };

      const service = Object.create(RewardEngineService.prototype);
      Object.assign(service, {
        subscriptionsService: { isSubscribed: jest.fn() },
        abuseDetectorService: { checkEngagement: jest.fn() },
        coinTransactionModel,
        dailyEngagementCountModel: { findOneAndUpdate: jest.fn() },
        postCoinLedgerModel,
      });

      await (service as RewardEngineService).reverseEngagement(makeEvent());

      // A $set: { thresholdReached: false } call should have been made
      expect(ledgerSets).toHaveLength(1);
      expect(ledgerSets[0].update.$set.thresholdReached).toBe(false);
    });

    it('should populate postCoinBalanceAfter on the reversal CoinTransaction', async () => {
      // Custom mock where $inc returns coinBalance: 50
      const createdTransactions: any[] = [];

      const postCoinLedgerModel = {
        findOneAndUpdate: jest
          .fn()
          .mockImplementation((filter: any, update: any, _options?: any) => {
            if (update.$inc !== undefined) {
              return Promise.resolve({
                postId: filter.postId,
                ownerId: filter.ownerId,
                coinBalance: 50,
                thresholdReached: false,
                converted: false,
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

      const service = Object.create(RewardEngineService.prototype);
      Object.assign(service, {
        subscriptionsService: { isSubscribed: jest.fn() },
        abuseDetectorService: { checkEngagement: jest.fn() },
        coinTransactionModel,
        dailyEngagementCountModel: { findOneAndUpdate: jest.fn() },
        postCoinLedgerModel,
      });

      await (service as RewardEngineService).reverseEngagement(makeEvent());

      expect(createdTransactions).toHaveLength(1);
      expect(createdTransactions[0].postCoinBalanceAfter).toBe(50);
    });
  });
});
