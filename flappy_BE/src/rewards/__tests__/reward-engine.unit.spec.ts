import {
  RewardEngineService,
  EngagementEvent,
  OWNER_REWARD,
} from '../reward-engine.service';

/**
 * Unit tests for RewardEngineService.
 *
 * We construct the service with in-memory mocks for all dependencies,
 * bypassing NestJS DI, and verify processEngagement / reverseEngagement logic.
 *
 * Reward rule: only the post owner receives coins. The engaging user does not.
 */

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  /** User IDs that are subscribed */
  subscribedUsers?: string[];
  /** Abuse check result override */
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

    it('should credit coins only to post owner when eligible', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.rewarded).toBe(true);
      expect(result.engagerCoins).toBe(0);
      expect(result.ownerCoins).toBe(OWNER_REWARD);

      // Only post owner gets a balance update
      expect(tracking.balanceUpdates).toHaveLength(1);
      expect(tracking.balanceUpdates[0]).toEqual({
        userId: 'owner1',
        amount: OWNER_REWARD,
      });
    });

    it('should create one CoinTransaction entry (post owner only) on success', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
      });

      const result = await service.processEngagement(makeEvent());

      expect(result.transactions).toHaveLength(1);
      expect(tracking.createdTransactions).toHaveLength(1);

      const ownerTxn = tracking.createdTransactions[0];
      expect(ownerTxn.userId).toBe('owner1');
      expect(ownerTxn.eventType).toBe('engagement_received');
      expect(ownerTxn.amount).toBe(OWNER_REWARD);
      expect(ownerTxn.relatedPostId).toBe('post1');
      expect(ownerTxn.relatedUserId).toBe('engager1');
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
      expect(tracking.balanceUpdates).toHaveLength(0);
    });

    it('should not create transactions when abuse check fails', async () => {
      const { service, tracking } = buildService({
        subscribedUsers: ['engager1', 'owner1'],
        abuseCheckResult: { allowed: false, reason: 'duplicate' },
      });

      await service.processEngagement(makeEvent());

      expect(tracking.createdTransactions).toHaveLength(0);
      expect(tracking.balanceUpdates).toHaveLength(0);
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

      const ownerTxn = tracking.createdTransactions[0];
      expect(ownerTxn.description).toContain('heart');
    });
  });

  describe('reverseEngagement', () => {
    it('should deduct coins only from post owner', async () => {
      const { service, tracking } = buildService();

      const result = await service.reverseEngagement(makeEvent());

      expect(result.rewarded).toBe(true);
      expect(result.engagerCoins).toBe(0);
      expect(result.ownerCoins).toBe(-OWNER_REWARD);

      // Only post owner gets a balance deduction
      expect(tracking.balanceUpdates).toHaveLength(1);
      expect(tracking.balanceUpdates[0]).toEqual({
        userId: 'owner1',
        amount: -OWNER_REWARD,
      });
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
  });
});
