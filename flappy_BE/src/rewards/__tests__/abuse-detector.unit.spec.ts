import {
  AbuseDetectorService,
  MAX_DAILY_ENGAGEMENTS,
  MIN_TRANSACTIONS_FOR_FARMING_CHECK,
  FARMING_CONCENTRATION_THRESHOLD,
  FARMING_MAX_GROUP_SIZE,
  FARMING_LOOKBACK_DAYS,
  FARMING_MAX_TRANSACTIONS,
} from '../abuse-detector.service';

/**
 * Unit tests for AbuseDetectorService.
 *
 * We construct the service with in-memory mocks for all Mongoose models,
 * bypassing NestJS DI, and verify each abuse check individually.
 */

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  /** Existing abuse flags in the system */
  abuseFlags?: Array<{ userId: string; status: string }>;
  /** Existing coin transactions (for duplicate check) */
  coinTransactions?: Array<{
    userId: string;
    relatedPostId: string;
    eventType: string;
  }>;
  /** Existing daily engagement counts */
  dailyCounts?: Array<{ userId: string; date: string; count: number }>;
}

function buildService(deps: MockDeps = {}): AbuseDetectorService {
  const { abuseFlags = [], coinTransactions = [], dailyCounts = [] } = deps;

  const abuseFlagModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      const found = abuseFlags.find(
        (f) => f.userId === filter.userId && f.status === filter.status,
      );
      return Promise.resolve(found || null);
    }),
    create: jest.fn().mockResolvedValue({}),
  };

  const coinTransactionModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      const found = coinTransactions.find(
        (t) =>
          t.userId === filter.userId &&
          t.relatedPostId === filter.relatedPostId &&
          t.eventType === filter.eventType,
      );
      return Promise.resolve(found || null);
    }),
  };

  const dailyEngagementCountModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      const found = dailyCounts.find(
        (d) => d.userId === filter.userId && d.date === filter.date,
      );
      return Promise.resolve(found || null);
    }),
  };

  const userModel = {
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  };

  const service = Object.create(AbuseDetectorService.prototype);
  Object.assign(service, {
    dailyEngagementCountModel,
    abuseFlagModel,
    coinTransactionModel,
    userModel,
  });

  return service as AbuseDetectorService;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AbuseDetectorService', () => {
  describe('checkEngagement', () => {
    it('should block self-engagement (engager === postOwner)', async () => {
      const service = buildService();
      const result = await service.checkEngagement('user1', 'post1', 'user1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('self_engagement');
    });

    it('should block flagged accounts', async () => {
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'pending_review' }],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('flagged');
    });

    it('should allow engagement when flag is resolved (not pending_review)', async () => {
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'resolved' }],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(true);
    });

    it('should block duplicate engagement (same user + same post)', async () => {
      const service = buildService({
        coinTransactions: [
          {
            userId: 'user1',
            relatedPostId: 'post1',
            eventType: 'engagement_earned',
          },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('duplicate');
    });

    it('should allow engagement on a different post even if user engaged another post', async () => {
      const service = buildService({
        coinTransactions: [
          {
            userId: 'user1',
            relatedPostId: 'post1',
            eventType: 'engagement_earned',
          },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post2',
        'user2',
      );

      expect(result.allowed).toBe(true);
    });

    it('should block when daily rate limit is exceeded', async () => {
      const today = new Date().toISOString().split('T')[0];
      const service = buildService({
        dailyCounts: [
          { userId: 'user1', date: today, count: MAX_DAILY_ENGAGEMENTS },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rate_limit');
    });

    it('should allow engagement when daily count is below limit', async () => {
      const today = new Date().toISOString().split('T')[0];
      const service = buildService({
        dailyCounts: [
          { userId: 'user1', date: today, count: MAX_DAILY_ENGAGEMENTS - 1 },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow engagement when no daily count record exists', async () => {
      const service = buildService();

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(true);
    });

    it('should check in order: self-engagement before flagged', async () => {
      // User is both self-engaging AND flagged — should return self_engagement
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'pending_review' }],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user1',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('self_engagement');
    });

    it('should check flagged before duplicate', async () => {
      // User is flagged AND has a duplicate — should return flagged
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'pending_review' }],
        coinTransactions: [
          {
            userId: 'user1',
            relatedPostId: 'post1',
            eventType: 'engagement_earned',
          },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('flagged');
    });

    it('should check duplicate before rate limit', async () => {
      const today = new Date().toISOString().split('T')[0];
      // User has duplicate AND exceeded rate limit — should return duplicate
      const service = buildService({
        coinTransactions: [
          {
            userId: 'user1',
            relatedPostId: 'post1',
            eventType: 'engagement_earned',
          },
        ],
        dailyCounts: [
          { userId: 'user1', date: today, count: MAX_DAILY_ENGAGEMENTS },
        ],
      });

      const result = await service.checkEngagement(
        'user1',
        'post1',
        'user2',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('duplicate');
    });
  });

  describe('flagAccount', () => {
    it('should create an abuse flag and set rewardsSuspended on user', async () => {
      const service = buildService();
      const abuseFlagModel = (service as any).abuseFlagModel;
      const userModel = (service as any).userModel;

      await service.flagAccount('user1', 'suspicious activity');

      expect(abuseFlagModel.create).toHaveBeenCalledWith({
        userId: 'user1',
        reason: 'suspicious activity',
        status: 'pending_review',
      });

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user1' },
        { rewardsSuspended: true },
      );
    });
  });

  describe('isAccountFlagged', () => {
    it('should return true when a pending_review flag exists', async () => {
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'pending_review' }],
      });

      const result = await service.isAccountFlagged('user1');
      expect(result).toBe(true);
    });

    it('should return false when no pending_review flag exists', async () => {
      const service = buildService({
        abuseFlags: [{ userId: 'user1', status: 'resolved' }],
      });

      const result = await service.isAccountFlagged('user1');
      expect(result).toBe(false);
    });

    it('should return false when no flags exist at all', async () => {
      const service = buildService();

      const result = await service.isAccountFlagged('user1');
      expect(result).toBe(false);
    });
  });

  // ── Engagement Farming Detection Tests ───────────────────────────────
  // Validates: Requirements 6.4, 6.5

  describe('checkEngagementFarming', () => {
    /**
     * Build a service with full support for the chained Mongoose queries
     * used by checkEngagementFarming (.find().sort().limit().exec()).
     */
    interface FarmingMockDeps {
      /**
       * All engagement_earned transactions in the system.
       * Each entry has userId, relatedUserId, eventType, and createdAt.
       */
      transactions?: Array<{
        userId: string;
        relatedUserId?: string;
        eventType: string;
        relatedPostId?: string;
        createdAt?: Date;
      }>;
      /** Existing abuse flags */
      abuseFlags?: Array<{ userId: string; status: string }>;
    }

    function buildFarmingService(deps: FarmingMockDeps = {}) {
      const { transactions = [], abuseFlags = [] } = deps;

      const flagsCreated: Array<{ userId: string; reason: string }> = [];
      const usersUpdated: Array<{ userId: string; update: any }> = [];

      const abuseFlagModel = {
        findOne: jest.fn().mockImplementation((filter: any) => {
          const found = abuseFlags.find(
            (f) => f.userId === filter.userId && f.status === filter.status,
          );
          return Promise.resolve(found || null);
        }),
        create: jest.fn().mockImplementation((data: any) => {
          flagsCreated.push({ userId: data.userId, reason: data.reason });
          // After creation, add to abuseFlags so subsequent isAccountFlagged calls see it
          abuseFlags.push({ userId: data.userId, status: data.status });
          return Promise.resolve(data);
        }),
      };

      /**
       * Mock coinTransactionModel.find() to support chained .sort().limit().exec()
       * The filter is used to match transactions by userId, eventType, and createdAt.
       */
      const coinTransactionModel = {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockImplementation((filter: any) => {
          let results = transactions.filter((t) => {
            if (filter.userId && t.userId !== filter.userId) return false;
            if (filter.eventType && t.eventType !== filter.eventType)
              return false;
            if (filter.relatedUserId && t.relatedUserId !== filter.relatedUserId)
              return false;
            if (filter.createdAt?.$gte) {
              const txDate = t.createdAt || new Date();
              if (txDate < filter.createdAt.$gte) return false;
            }
            return true;
          });

          // Return a chainable query object
          const chain = {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockImplementation((n: number) => {
              results = results.slice(0, n);
              return chain;
            }),
            exec: jest.fn().mockResolvedValue(results),
          };
          return chain;
        }),
      };

      const dailyEngagementCountModel = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const userModel = {
        findOneAndUpdate: jest.fn().mockImplementation((filter: any, update: any) => {
          usersUpdated.push({ userId: filter.userId, update });
          return Promise.resolve({});
        }),
      };

      const service = Object.create(AbuseDetectorService.prototype);
      Object.assign(service, {
        dailyEngagementCountModel,
        abuseFlagModel,
        coinTransactionModel,
        userModel,
      });

      return {
        service: service as AbuseDetectorService,
        tracking: { flagsCreated, usersUpdated },
      };
    }

    /** Helper: create N transactions from engager → recipient within the lookback window */
    function makeTransactions(
      userId: string,
      relatedUserId: string,
      count: number,
    ) {
      return Array.from({ length: count }, (_, i) => ({
        userId,
        relatedUserId,
        eventType: 'engagement_earned' as const,
        relatedPostId: `post_${userId}_${relatedUserId}_${i}`,
        createdAt: new Date(), // within lookback window
      }));
    }

    it('should not flag when there are too few transactions for analysis', async () => {
      // Fewer than MIN_TRANSACTIONS_FOR_FARMING_CHECK transactions
      const txns = makeTransactions('userA', 'userB', MIN_TRANSACTIONS_FOR_FARMING_CHECK - 1);
      const { service } = buildFarmingService({ transactions: txns });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(false);
      expect(result.flaggedUsers).toHaveLength(0);
    });

    it('should detect two users exclusively engaging with each other', async () => {
      // userA sends all engagements to userB
      const txnsAtoB = makeTransactions('userA', 'userB', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);
      // userB sends engagements back to userA (reciprocal)
      const txnsBtoA = makeTransactions('userB', 'userA', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);

      const { service, tracking } = buildFarmingService({
        transactions: [...txnsAtoB, ...txnsBtoA],
      });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(true);
      expect(result.flaggedUsers).toContain('userA');
      expect(result.flaggedUsers).toContain('userB');
      expect(result.reason).toBeDefined();

      // Verify flagAccount was called — abuse flags created and rewardsSuspended set
      expect(tracking.flagsCreated.length).toBeGreaterThanOrEqual(2);
      expect(tracking.flagsCreated.map((f) => f.userId)).toContain('userA');
      expect(tracking.flagsCreated.map((f) => f.userId)).toContain('userB');

      // Verify rewardsSuspended was set on flagged users
      expect(tracking.usersUpdated.map((u) => u.userId)).toContain('userA');
      expect(tracking.usersUpdated.map((u) => u.userId)).toContain('userB');
      for (const update of tracking.usersUpdated) {
        expect(update.update).toEqual({ rewardsSuspended: true });
      }
    });

    it('should detect a small ring of 3 users engaging only with each other', async () => {
      const count = MIN_TRANSACTIONS_FOR_FARMING_CHECK + 3;
      // userA → userB (all engagements)
      const txnsAtoB = makeTransactions('userA', 'userB', count);
      // userB → userA (reciprocal back to userA)
      const txnsBtoA = makeTransactions('userB', 'userA', count);
      // userC → userA (reciprocal back to userA)
      const txnsCtoA = makeTransactions('userC', 'userA', count);

      const { service } = buildFarmingService({
        transactions: [...txnsAtoB, ...txnsBtoA, ...txnsCtoA],
      });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(true);
      expect(result.flaggedUsers).toContain('userA');
      expect(result.flaggedUsers).toContain('userB');
    });

    it('should detect a ring of 4 users engaging in a closed group', async () => {
      const count = MIN_TRANSACTIONS_FOR_FARMING_CHECK + 3;
      // userA splits engagements among userB, userC, userD (all within max group size)
      const txnsAtoB = makeTransactions('userA', 'userB', Math.ceil(count / 3));
      const txnsAtoC = makeTransactions('userA', 'userC', Math.ceil(count / 3));
      const txnsAtoD = makeTransactions('userA', 'userD', Math.ceil(count / 3));
      // All three reciprocate back to userA
      const txnsBtoA = makeTransactions('userB', 'userA', count);
      const txnsCtoA = makeTransactions('userC', 'userA', count);
      const txnsDtoA = makeTransactions('userD', 'userA', count);

      const { service } = buildFarmingService({
        transactions: [
          ...txnsAtoB, ...txnsAtoC, ...txnsAtoD,
          ...txnsBtoA, ...txnsCtoA, ...txnsDtoA,
        ],
      });

      const result = await service.checkEngagementFarming('userA');

      // All engagements are concentrated among 3 recipients (group of 4 including userA)
      // and all reciprocate — should be detected
      expect(result.detected).toBe(true);
      expect(result.flaggedUsers).toContain('userA');
      expect(result.flaggedUsers.length).toBeGreaterThanOrEqual(2);
    });

    it('should NOT flag legitimate diverse engagement patterns', async () => {
      // userA engages with many different users — no concentration
      const diverseRecipients = Array.from({ length: 10 }, (_, i) => `user${i}`);
      const txns: Array<{
        userId: string;
        relatedUserId: string;
        eventType: string;
        relatedPostId: string;
        createdAt: Date;
      }> = [];

      // Spread engagements evenly across 10 recipients
      for (const recipient of diverseRecipients) {
        txns.push(
          ...makeTransactions('userA', recipient, 2),
        );
      }

      const { service } = buildFarmingService({ transactions: txns });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(false);
      expect(result.flaggedUsers).toHaveLength(0);
    });

    it('should NOT flag when engagement is concentrated but not reciprocal', async () => {
      // userA sends all engagements to userB, but userB never engages back
      const txnsAtoB = makeTransactions('userA', 'userB', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);

      const { service } = buildFarmingService({ transactions: txnsAtoB });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(false);
      expect(result.flaggedUsers).toHaveLength(0);
    });

    it('should not double-flag users who are already flagged', async () => {
      const txnsAtoB = makeTransactions('userA', 'userB', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);
      const txnsBtoA = makeTransactions('userB', 'userA', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);

      // userB is already flagged
      const { service, tracking } = buildFarmingService({
        transactions: [...txnsAtoB, ...txnsBtoA],
        abuseFlags: [{ userId: 'userB', status: 'pending_review' }],
      });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(true);
      expect(result.flaggedUsers).toContain('userA');
      expect(result.flaggedUsers).toContain('userB');

      // userB should NOT be flagged again (already flagged)
      const userBFlags = tracking.flagsCreated.filter((f) => f.userId === 'userB');
      expect(userBFlags).toHaveLength(0);

      // userA should be flagged (not previously flagged)
      const userAFlags = tracking.flagsCreated.filter((f) => f.userId === 'userA');
      expect(userAFlags).toHaveLength(1);
    });

    it('should include a descriptive reason when farming is detected', async () => {
      const txnsAtoB = makeTransactions('userA', 'userB', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);
      const txnsBtoA = makeTransactions('userB', 'userA', MIN_TRANSACTIONS_FOR_FARMING_CHECK + 5);

      const { service } = buildFarmingService({
        transactions: [...txnsAtoB, ...txnsBtoA],
      });

      const result = await service.checkEngagementFarming('userA');

      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Engagement farming detected');
      expect(result.reason).toContain('concentration');
    });
  });
});
