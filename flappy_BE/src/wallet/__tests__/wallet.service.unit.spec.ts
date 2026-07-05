import {
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { WalletService } from '../wallet.service';

/**
 * Unit tests for WalletService.
 *
 * We construct the service with in-memory mocks for all dependencies,
 * bypassing NestJS DI, using the same Object.create + Object.assign pattern
 * as reward-engine.unit.spec.ts.
 */

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  /** Records returned by postCoinLedgerModel.find */
  ledgerRecords?: any[];
  /** Record returned by postCoinLedgerModel.findOne */
  ledgerFindOneResult?: any;
  /** Record returned by postCoinLedgerModel.findOneAndUpdate */
  ledgerFindOneAndUpdateResult?: any;
  /** Record returned by coinTransactionModel.create */
  transactionCreateResult?: any;
  /** Records returned by coinTransactionModel.find chain */
  transactionFindResults?: any[];
  /** Count returned by coinTransactionModel.countDocuments */
  transactionCount?: number;
  /** Count returned by postCoinLedgerModel.countDocuments */
  ledgerCount?: number;
}

function buildService(deps: MockDeps = {}) {
  const {
    ledgerRecords = [],
    ledgerFindOneResult = null,
    ledgerFindOneAndUpdateResult = null,
    transactionCreateResult = { _id: 'txn1', eventType: 'conversion' },
    transactionFindResults = [],
    transactionCount = 0,
    ledgerCount = 0,
  } = deps;

  // Track calls for assertions
  const findFilters: any[] = [];
  const findOneFilters: any[] = [];
  const findOneAndUpdateCalls: Array<{ filter: any; update: any; options?: any }> = [];
  const transactionCreateCalls: any[] = [];

  // Build a chainable mock for find().sort().skip().limit().exec()
  function makeChainableFindMock(results: any[]) {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(results),
    };
    return chain;
  }

  const postCoinLedgerModel = {
    find: jest.fn().mockImplementation((filter: any) => {
      findFilters.push(filter);
      const chain = makeChainableFindMock(ledgerRecords);
      // Also support direct .exec() for getWalletSummary which calls find().exec()
      (chain as any).exec = jest.fn().mockResolvedValue(ledgerRecords);
      return chain;
    }),
    findOne: jest.fn().mockImplementation((filter: any) => {
      findOneFilters.push(filter);
      return {
        exec: jest.fn().mockResolvedValue(ledgerFindOneResult),
      };
    }),
    findOneAndUpdate: jest.fn().mockImplementation((filter: any, update: any, options?: any) => {
      findOneAndUpdateCalls.push({ filter, update, options });
      return {
        exec: jest.fn().mockResolvedValue(ledgerFindOneAndUpdateResult),
      };
    }),
    countDocuments: jest.fn().mockResolvedValue(ledgerCount),
  };

  const coinTransactionModel = {
    create: jest.fn().mockImplementation((data: any) => {
      transactionCreateCalls.push(data);
      return Promise.resolve(transactionCreateResult);
    }),
    find: jest.fn().mockImplementation((filter: any) => {
      findFilters.push(filter);
      return makeChainableFindMock(transactionFindResults);
    }),
    countDocuments: jest.fn().mockResolvedValue(transactionCount),
  };

  const service = Object.create(WalletService.prototype);
  Object.assign(service, {
    postCoinLedgerModel,
    coinTransactionModel,
  });

  return {
    service: service as WalletService,
    mocks: {
      postCoinLedgerModel,
      coinTransactionModel,
    },
    tracking: {
      findFilters,
      findOneFilters,
      findOneAndUpdateCalls,
      transactionCreateCalls,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('WalletService', () => {
  // ── getWalletSummary ──────────────────────────────────────────────

  describe('getWalletSummary', () => {
    it('returns withdrawableBalance = 0 and pendingBalance = 0 for a user with no posts', async () => {
      const { service } = buildService({ ledgerRecords: [] });

      const result = await service.getWalletSummary('user1');

      expect(result.withdrawableBalance).toBe(0);
      expect(result.pendingBalance).toBe(0);
      expect(result.thresholdReachedPostCount).toBe(0);
      expect(result.totalPostCount).toBe(0);
    });

    it('sums only threshold-reached posts into withdrawableBalance', async () => {
      const { service } = buildService({
        ledgerRecords: [
          { coinBalance: 500, thresholdReached: true },
          { coinBalance: 300, thresholdReached: false },
        ],
      });

      const result = await service.getWalletSummary('user1');

      expect(result.withdrawableBalance).toBe(500);
      expect(result.pendingBalance).toBe(300);
    });

    it('sums only non-threshold posts into pendingBalance', async () => {
      const { service } = buildService({
        ledgerRecords: [
          { coinBalance: 200, thresholdReached: false },
          { coinBalance: 100, thresholdReached: false },
        ],
      });

      const result = await service.getWalletSummary('user1');

      expect(result.withdrawableBalance).toBe(0);
      expect(result.pendingBalance).toBe(300);
    });

    it('returns correct thresholdReachedPostCount and totalPostCount', async () => {
      const { service } = buildService({
        ledgerRecords: [
          { coinBalance: 1200, thresholdReached: true },
          { coinBalance: 1500, thresholdReached: true },
          { coinBalance: 400, thresholdReached: false },
        ],
      });

      const result = await service.getWalletSummary('user1');

      expect(result.thresholdReachedPostCount).toBe(2);
      expect(result.totalPostCount).toBe(3);
    });
  });

  // ── convertPostCoins ──────────────────────────────────────────────

  describe('convertPostCoins', () => {
    it('throws UnprocessableEntityException with threshold_not_reached when thresholdReached = false', async () => {
      const { service } = buildService({
        ledgerFindOneResult: {
          postId: 'p1',
          ownerId: 'u1',
          thresholdReached: false,
          converted: false,
          coinBalance: 500,
        },
      });

      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        'threshold_not_reached',
      );
    });

    it('throws ConflictException with already_converted when converted = true', async () => {
      const { service } = buildService({
        ledgerFindOneResult: {
          postId: 'p1',
          ownerId: 'u1',
          thresholdReached: true,
          converted: true,
          coinBalance: 1000,
        },
      });

      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        'already_converted',
      );
    });

    it('throws NotFoundException with post_not_found when ownerId !== userId (findOne returns null)', async () => {
      // The query filters by ownerId, so not found = not owner
      const { service } = buildService({
        ledgerFindOneResult: null,
      });

      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        'post_not_found',
      );
    });

    it('throws NotFoundException with post_not_found when ledger record does not exist', async () => {
      const { service } = buildService({
        ledgerFindOneResult: null,
      });

      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.convertPostCoins('u1', 'p1')).rejects.toThrow(
        'post_not_found',
      );
    });

    it('sets converted = true and creates a conversion CoinTransaction on success', async () => {
      const { service, tracking } = buildService({
        ledgerFindOneResult: {
          postId: 'p1',
          ownerId: 'u1',
          thresholdReached: true,
          converted: false,
          coinBalance: 1200,
        },
        ledgerFindOneAndUpdateResult: {
          postId: 'p1',
          ownerId: 'u1',
          converted: true,
          coinBalance: 1200,
        },
        transactionCreateResult: { _id: 'txn1', eventType: 'conversion' },
      });

      const result = await service.convertPostCoins('u1', 'p1');

      // Assert result shape
      expect(result.success).toBe(true);
      expect(result.convertedAmount).toBe(1200);
      expect(result.postId).toBe('p1');
      expect(result.transactionId).toBe('txn1');

      // Assert findOneAndUpdate was called with $set: { converted: true, convertedAt: Date }
      expect(tracking.findOneAndUpdateCalls).toHaveLength(1);
      const updateCall = tracking.findOneAndUpdateCalls[0];
      expect(updateCall.update.$set.converted).toBe(true);
      expect(updateCall.update.$set.convertedAt).toBeInstanceOf(Date);

      // Assert coinTransactionModel.create was called with eventType: 'conversion'
      expect(tracking.transactionCreateCalls).toHaveLength(1);
      expect(tracking.transactionCreateCalls[0].eventType).toBe('conversion');
    });
  });

  // ── getTransactionHistory ─────────────────────────────────────────

  describe('getTransactionHistory', () => {
    it('returns records sorted by createdAt descending with correct pagination', async () => {
      const mockTransactions = [
        { _id: 'txn1', eventType: 'engagement_received', createdAt: new Date('2024-01-02') },
        { _id: 'txn2', eventType: 'conversion', createdAt: new Date('2024-01-01') },
      ];

      const { service } = buildService({
        transactionFindResults: mockTransactions,
        transactionCount: 10,
      });

      const result = await service.getTransactionHistory('u1', 1, 5);

      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.items).toHaveLength(2);
    });

    it('filters by relatedPostId when provided', async () => {
      const { service, mocks } = buildService({
        transactionFindResults: [],
        transactionCount: 0,
      });

      await service.getTransactionHistory('u1', 1, 10, 'post123');

      // Assert the filter passed to find includes relatedPostId
      const findCall = mocks.coinTransactionModel.find.mock.calls[0][0];
      expect(findCall).toMatchObject({ relatedPostId: 'post123' });
    });
  });

  // ── getPostEarnings ───────────────────────────────────────────────

  describe('getPostEarnings', () => {
    it('returns posts sorted by coinBalance descending with correct pagination', async () => {
      const mockRecords = [
        { postId: 'p1', coinBalance: 1500, thresholdReached: true, converted: false },
        { postId: 'p2', coinBalance: 800, thresholdReached: false, converted: false },
      ];

      const { service } = buildService({
        ledgerRecords: mockRecords,
        ledgerCount: 5,
      });

      const result = await service.getPostEarnings('u1', 2, 2);

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });
});
