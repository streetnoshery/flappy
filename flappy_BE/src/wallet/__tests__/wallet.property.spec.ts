import * as fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import {
  WalletService,
  COIN_THRESHOLD,
  ENGAGEMENT_THRESHOLD,
  CONVERSION_RATE,
} from '../wallet.service';

/**
 * Property-based tests for WalletService.
 *
 * We construct the service with in-memory mocks for all Mongoose models,
 * bypassing NestJS DI, following the same pattern as the reward-engine
 * property tests.
 *
 * Feature: subscription-rewards
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,12}$/)
  .filter((s) => s.trim().length >= 4);

// ── Property 6: Transaction history sort order ───────────────────────

describe('WalletService — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * Feature: subscription-rewards, Property 6: Transaction history sort order
   *
   * For any set of coin transactions belonging to a user, the wallet service
   * SHALL return them sorted by createdAt in descending order (most recent first).
   */
  it('Property 6: Transaction history sort order', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.array(
          fc.record({
            amount: fc.integer({ min: -500, max: 500 }).filter((n) => n !== 0),
            eventType: fc.constantFrom(
              'engagement_earned',
              'engagement_received',
              'engagement_reversed',
              'conversion',
            ),
            minutesAgo: fc.integer({ min: 0, max: 100000 }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        fc.integer({ min: 1, max: 3 }),
        async (userId, txnSpecs, page) => {
          // Build transaction documents with random createdAt dates
          const transactions = txnSpecs.map((spec, i) => ({
            _id: `txn_${i}`,
            userId,
            amount: spec.amount,
            eventType: spec.eventType,
            relatedPostId: `post_${i}`,
            relatedUserId: `user_${i}`,
            description: `Transaction ${i}`,
            createdAt: new Date(Date.now() - spec.minutesAgo * 60_000),
          }));

          const limit = 10;
          const skip = (page - 1) * limit;

          // Sort by createdAt descending (as the real DB would)
          const sorted = [...transactions].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
          const pageSlice = sorted.slice(skip, skip + limit);

          // Mock coinTransactionModel with sort chain
          const coinTransactionModel = {
            find: jest.fn().mockImplementation(() => ({
              sort: jest.fn().mockImplementation((sortObj: any) => {
                let result = [...transactions];
                if (sortObj?.createdAt === -1) {
                  result.sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
                  );
                }
                return {
                  skip: jest.fn().mockImplementation((n: number) => {
                    result = result.slice(n);
                    return {
                      limit: jest.fn().mockImplementation((l: number) => {
                        result = result.slice(0, l);
                        return {
                          exec: jest.fn().mockResolvedValue(result),
                        };
                      }),
                    };
                  }),
                };
              }),
            })),
            countDocuments: jest
              .fn()
              .mockResolvedValue(transactions.length),
          };

          const conversionRecordModel = {};
          const userModel = {};

          const service = Object.create(WalletService.prototype);
          Object.assign(service, {
            coinTransactionModel,
            conversionRecordModel,
            userModel,
          });

          const result = await (service as WalletService).getTransactions(
            userId,
            page,
            limit,
          );

          // (1) Returned transactions are sorted by createdAt descending
          for (let i = 0; i < result.transactions.length - 1; i++) {
            const current = new Date(
              result.transactions[i].createdAt!,
            ).getTime();
            const next = new Date(
              result.transactions[i + 1].createdAt!,
            ).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }

          // (2) Returned count matches expected page slice
          expect(result.transactions.length).toBe(pageSlice.length);

          // (3) Total count is correct
          expect(result.total).toBe(transactions.length);

          // (4) Page number is correct
          expect(result.page).toBe(page);

          // (5) Total pages is correct
          expect(result.totalPages).toBe(
            Math.ceil(transactions.length / limit),
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  // ── Property 7: Conversion eligibility check ────────────────────────

  /**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   *
   * Feature: subscription-rewards, Property 7: Conversion eligibility check
   *
   * For any subscriber requesting a coin conversion, the conversion SHALL be
   * approved if and only if the subscriber's coin balance meets or exceeds the
   * Coin_Threshold AND the subscriber has received at least Engagement_Threshold
   * qualifying engagement events from distinct subscribers.
   */
  it('Property 7: Conversion eligibility check', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        // Balance: sometimes below threshold, sometimes at/above
        fc.integer({ min: 0, max: COIN_THRESHOLD * 3 }),
        // Distinct engager count: sometimes below threshold, sometimes at/above
        fc.integer({ min: 0, max: ENGAGEMENT_THRESHOLD * 3 }),
        async (userId, balance, distinctEngagerCount) => {
          const amount = COIN_THRESHOLD; // Always request exactly the threshold amount

          const meetsBalanceThreshold = balance >= amount;
          const meetsEngagementThreshold =
            distinctEngagerCount >= ENGAGEMENT_THRESHOLD;

          // Generate distinct engager IDs
          const distinctEngagers = Array.from(
            { length: distinctEngagerCount },
            (_, i) => `engager_${i}`,
          );

          // Mock userModel
          const userModel = {
            findOne: jest.fn().mockResolvedValue({
              userId,
              coinBalance: balance,
            }),
            findOneAndUpdate: jest.fn().mockResolvedValue({
              userId,
              coinBalance: balance - amount,
            }),
          };

          // Mock coinTransactionModel
          const coinTransactionModel = {
            distinct: jest.fn().mockResolvedValue(distinctEngagers),
            create: jest.fn().mockImplementation((data: any) =>
              Promise.resolve({ ...data, _id: 'txn_conv' }),
            ),
          };

          // Mock conversionRecordModel
          const conversionRecordModel = {
            findOne: jest.fn().mockResolvedValue(null), // no pending conversion
            create: jest.fn().mockImplementation((data: any) =>
              Promise.resolve({ ...data, _id: 'conv_1' }),
            ),
          };

          const service = Object.create(WalletService.prototype);
          Object.assign(service, {
            coinTransactionModel,
            conversionRecordModel,
            userModel,
          });

          if (meetsBalanceThreshold && meetsEngagementThreshold) {
            // Should succeed
            const result = await (
              service as WalletService
            ).requestConversion(userId, amount);
            expect(result.success).toBe(true);
            expect(result.conversionRecord).toBeDefined();
          } else if (!meetsBalanceThreshold) {
            // Should throw BadRequestException about coin threshold
            await expect(
              (service as WalletService).requestConversion(userId, amount),
            ).rejects.toThrow(BadRequestException);

            await expect(
              (service as WalletService).requestConversion(userId, amount),
            ).rejects.toThrow(/Insufficient coin balance/);
          } else {
            // Balance meets threshold but engagement doesn't
            await expect(
              (service as WalletService).requestConversion(userId, amount),
            ).rejects.toThrow(BadRequestException);

            await expect(
              (service as WalletService).requestConversion(userId, amount),
            ).rejects.toThrow(/Engagement threshold not met/);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  // ── Property 8: Conversion execution correctness ────────────────────

  /**
   * **Validates: Requirements 4.5, 4.6**
   *
   * Feature: subscription-rewards, Property 8: Conversion execution correctness
   *
   * For any approved conversion request, the system SHALL atomically deduct
   * the converted coins from the subscriber's balance, record a debit entry
   * in the Coin Ledger, and create a ConversionRecord with the correct
   * coinsConverted, conversionRate, payoutAmount, and status of 'pending'.
   */
  it('Property 8: Conversion execution correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        // Conversion amount: always at or above COIN_THRESHOLD
        fc.integer({ min: COIN_THRESHOLD, max: COIN_THRESHOLD * 5 }),
        async (userId, amount) => {
          const balance = amount + 100; // Ensure balance exceeds amount

          // Generate enough distinct engagers to meet threshold
          const distinctEngagers = Array.from(
            { length: ENGAGEMENT_THRESHOLD + 10 },
            (_, i) => `engager_${i}`,
          );

          const balanceUpdates: Array<{
            filter: any;
            update: any;
          }> = [];
          const createdTransactions: any[] = [];
          const createdConversions: any[] = [];

          // Mock userModel
          const userModel = {
            findOne: jest.fn().mockResolvedValue({
              userId,
              coinBalance: balance,
            }),
            findOneAndUpdate: jest
              .fn()
              .mockImplementation((filter: any, update: any) => {
                balanceUpdates.push({ filter, update });
                return Promise.resolve({
                  userId,
                  coinBalance: balance - amount,
                });
              }),
          };

          // Mock coinTransactionModel
          const coinTransactionModel = {
            distinct: jest.fn().mockResolvedValue(distinctEngagers),
            create: jest.fn().mockImplementation((data: any) => {
              const doc = {
                ...data,
                _id: `txn_${createdTransactions.length}`,
              };
              createdTransactions.push(doc);
              return Promise.resolve(doc);
            }),
          };

          // Mock conversionRecordModel
          const conversionRecordModel = {
            findOne: jest.fn().mockResolvedValue(null), // no pending conversion
            create: jest.fn().mockImplementation((data: any) => {
              const doc = {
                ...data,
                _id: `conv_${createdConversions.length}`,
              };
              createdConversions.push(doc);
              return Promise.resolve(doc);
            }),
          };

          const service = Object.create(WalletService.prototype);
          Object.assign(service, {
            coinTransactionModel,
            conversionRecordModel,
            userModel,
          });

          const result = await (service as WalletService).requestConversion(
            userId,
            amount,
          );

          // (1) Conversion succeeds
          expect(result.success).toBe(true);

          // (2) User balance is decremented by the conversion amount
          expect(balanceUpdates.length).toBeGreaterThanOrEqual(1);
          const deductUpdate = balanceUpdates.find(
            (u) => u.update?.$inc?.coinBalance === -amount,
          );
          expect(deductUpdate).toBeDefined();
          expect(deductUpdate!.filter.userId).toBe(userId);

          // (3) A CoinTransaction with eventType 'conversion' and negative amount is created
          expect(createdTransactions).toHaveLength(1);
          const txn = createdTransactions[0];
          expect(txn.userId).toBe(userId);
          expect(txn.eventType).toBe('conversion');
          expect(txn.amount).toBe(-amount);

          // (4) A ConversionRecord with correct fields is created
          expect(createdConversions).toHaveLength(1);
          const conv = createdConversions[0];
          expect(conv.userId).toBe(userId);
          expect(conv.coinsConverted).toBe(amount);
          expect(conv.conversionRate).toBe(CONVERSION_RATE);

          // (5) payoutAmount = amount / CONVERSION_RATE
          const expectedPayout = amount / CONVERSION_RATE;
          expect(conv.payoutAmount).toBe(expectedPayout);

          // (6) ConversionRecord status is 'pending'
          expect(conv.status).toBe('pending');

          // (7) The returned conversionRecord matches
          expect(result.conversionRecord).toBeDefined();
          expect(result.conversionRecord!.coinsConverted).toBe(amount);
          expect(result.conversionRecord!.status).toBe('pending');
        },
      ),
      { numRuns: 20 },
    );
  });
});
