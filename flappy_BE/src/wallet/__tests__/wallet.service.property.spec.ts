import * as fc from 'fast-check';
import { ConflictException } from '@nestjs/common';
import { WalletService } from '../wallet.service';

/**
 * Property-based tests for WalletService.
 *
 * Feature: per-post-coin-rewards
 *
 * Uses the same Object.create + Object.assign mock-factory pattern as
 * reward-engine.property.spec.ts, bypassing NestJS DI.
 */

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  /** Records returned by postCoinLedgerModel.find().exec() */
  ledgerRecords?: any[];
  /** Record returned by postCoinLedgerModel.findOne().exec() */
  ledgerFindOneResult?: any;
  /** Record returned by postCoinLedgerModel.findOneAndUpdate().exec() */
  ledgerFindOneAndUpdateResult?: any;
  /** Record returned by coinTransactionModel.create */
  transactionCreateResult?: any;
}

function buildService(deps: MockDeps = {}) {
  const {
    ledgerRecords = [],
    ledgerFindOneResult = null,
    ledgerFindOneAndUpdateResult = null,
    transactionCreateResult = { _id: 'txn1', eventType: 'conversion' },
  } = deps;

  const findOneAndUpdateCalls: Array<{ filter: any; update: any; options?: any }> = [];
  const transactionCreateCalls: any[] = [];

  function makeChainableFindMock(results: any[]) {
    return {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(results),
    };
  }

  const postCoinLedgerModel = {
    find: jest.fn().mockImplementation(() => {
      const chain = makeChainableFindMock(ledgerRecords);
      (chain as any).exec = jest.fn().mockResolvedValue(ledgerRecords);
      return chain;
    }),
    findOne: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(ledgerFindOneResult),
    })),
    findOneAndUpdate: jest.fn().mockImplementation((filter: any, update: any, options?: any) => {
      findOneAndUpdateCalls.push({ filter, update, options });
      return {
        exec: jest.fn().mockResolvedValue(ledgerFindOneAndUpdateResult),
      };
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const coinTransactionModel = {
    create: jest.fn().mockImplementation((data: any) => {
      transactionCreateCalls.push(data);
      return Promise.resolve(transactionCreateResult);
    }),
    find: jest.fn().mockImplementation(() => makeChainableFindMock([])),
    countDocuments: jest.fn().mockResolvedValue(0),
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
      findOneAndUpdateCalls,
      transactionCreateCalls,
    },
  };
}

// ── Property Tests ───────────────────────────────────────────────────

describe('WalletService — Property-Based Tests (per-post-coin-rewards)', () => {
  /**
   * **Validates: Requirements 2.1, 2.3, 2.4**
   *
   * Feature: per-post-coin-rewards, Property 4: Withdrawable balance equals sum of threshold-reached post balances
   *
   * For any user with arbitrary post ledger state, getWalletSummary returns
   * withdrawableBalance equal to the sum of coinBalance for records where thresholdReached = true.
   */
  it('Property 4: Withdrawable balance equals sum of threshold-reached post balances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            coinBalance: fc.integer({ min: 0, max: 5000 }),
            thresholdReached: fc.boolean(),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        async (records) => {
          const { service } = buildService({ ledgerRecords: records });

          const result = await service.getWalletSummary('user1');

          // Compute expected withdrawable balance from the generated records
          const expectedWithdrawable = records
            .filter((r) => r.thresholdReached)
            .reduce((sum, r) => sum + r.coinBalance, 0);

          expect(result.withdrawableBalance).toBe(expectedWithdrawable);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 4.5**
   *
   * Feature: per-post-coin-rewards, Property 6: Conversion is idempotent — a converted post cannot be converted again
   *
   * For any post with thresholdReached = true and converted = true, any call to
   * convertPostCoins SHALL throw ConflictException with reason 'already_converted'
   * and SHALL NOT call postCoinLedgerModel.findOneAndUpdate with $set: { converted: true }.
   */
  it('Property 6: Conversion is idempotent — a converted post cannot be converted again', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        async (userId, postId) => {
          const { service, tracking } = buildService({
            ledgerFindOneResult: {
              postId,
              ownerId: userId,
              thresholdReached: true,
              converted: true,
              coinBalance: 1200,
            },
          });

          // The call must throw ConflictException with 'already_converted'
          await expect(service.convertPostCoins(userId, postId)).rejects.toThrow(
            ConflictException,
          );
          await expect(service.convertPostCoins(userId, postId)).rejects.toThrow(
            'already_converted',
          );

          // findOneAndUpdate with $set: { converted: true } must NOT have been called
          const convertingCalls = tracking.findOneAndUpdateCalls.filter(
            (call) => call.update?.$set?.converted === true,
          );
          expect(convertingCalls).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
