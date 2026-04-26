import * as fc from 'fast-check';
import { SubscriptionsService } from '../subscriptions.service';

/**
 * Property-based tests for subscription toggle round-trip.
 *
 * We construct a SubscriptionsService with in-memory mocks for the
 * Mongoose Subscription and User models, then exercise toggleSubscription
 * against randomly generated data to verify universal properties.
 *
 * Feature: subscription-rewards, Property 1: Subscription toggle round-trip
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random user-id-like string */
const arbUserId: fc.Arbitrary<string> = fc
  .string({ minLength: 4, maxLength: 16 })
  .filter((s) => s.trim().length >= 4);

// ── Mock factory ─────────────────────────────────────────────────────

interface MockDeps {
  userId: string;
  initialCoinBalance: number;
}

function buildSubscriptionsService(deps: MockDeps) {
  const { userId, initialCoinBalance } = deps;

  // In-memory stores
  const users = new Map<string, any>();
  users.set(userId, {
    userId,
    isSubscribed: false,
    subscribedAt: undefined,
    coinBalance: initialCoinBalance,
  });

  const subscriptions = new Map<string, any>();

  // userModel mock
  const userModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      const user = users.get(filter?.userId);
      return user ? user : null;
    }),
    findOneAndUpdate: jest.fn().mockImplementation((filter: any, update: any) => {
      const user = users.get(filter?.userId);
      if (!user) return null;
      // Apply $set-style updates
      for (const [key, value] of Object.entries(update)) {
        if (key.startsWith('$')) continue;
        user[key] = value;
      }
      users.set(filter.userId, user);
      return user;
    }),
  };

  // subscriptionModel mock
  const subscriptionModel = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      return subscriptions.get(filter?.userId) ?? null;
    }),
    findOneAndUpdate: jest.fn().mockImplementation((filter: any, update: any, options?: any) => {
      let sub = subscriptions.get(filter?.userId);
      if (!sub && options?.upsert) {
        sub = { userId: filter.userId, isActive: false };
      }
      if (!sub) return null;

      // Apply updates
      for (const [key, value] of Object.entries(update)) {
        if (key === '$unset') {
          for (const field of Object.keys(value as any)) {
            delete sub[field];
          }
        } else if (!key.startsWith('$')) {
          sub[key] = value;
        }
      }

      subscriptions.set(filter.userId, sub);
      return sub;
    }),
  };

  // Construct the service bypassing DI
  const service = Object.create(SubscriptionsService.prototype);
  Object.assign(service, {
    subscriptionModel,
    userModel,
  });

  return {
    service: service as SubscriptionsService,
    getUser: () => users.get(userId),
    getSubscription: () => subscriptions.get(userId),
  };
}

// ── Property Tests ───────────────────────────────────────────────────

describe('Subscription Toggle Round-Trip — Property-Based Tests', () => {
  /**
   * **Validates: Requirements 1.2, 1.3, 1.4**
   *
   * Property 1: Subscription toggle round-trip
   *
   * For any user, toggling subscription twice should return the user to
   * their original subscription state, and each intermediate state should
   * have the correct isSubscribed flag and corresponding date field
   * (subscribedAt when active, unsubscribedAt when inactive).
   */
  it('Property 1: toggling subscription twice returns user to original state with correct intermediate flags and dates', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.integer({ min: 0, max: 10000 }),
        async (userId, initialCoinBalance) => {
          const { service, getUser, getSubscription } = buildSubscriptionsService({
            userId,
            initialCoinBalance,
          });

          // ── Initial state: user is NOT subscribed ──
          const userBefore = getUser();
          expect(userBefore.isSubscribed).toBe(false);

          // ── First toggle: unsubscribed → subscribed ──
          const result1 = await service.toggleSubscription(userId);

          // Result should indicate subscribed
          expect(result1.isSubscribed).toBe(true);
          expect(result1.subscribedAt).toBeInstanceOf(Date);
          expect(result1.unsubscribedAt).toBeUndefined();

          // User document should reflect subscribed state
          const userAfterFirst = getUser();
          expect(userAfterFirst.isSubscribed).toBe(true);
          expect(userAfterFirst.subscribedAt).toBeInstanceOf(Date);

          // Subscription document should be active
          const subAfterFirst = getSubscription();
          expect(subAfterFirst.isActive).toBe(true);
          expect(subAfterFirst.subscribedAt).toBeInstanceOf(Date);

          // ── Second toggle: subscribed → unsubscribed ──
          const result2 = await service.toggleSubscription(userId);

          // Result should indicate unsubscribed
          expect(result2.isSubscribed).toBe(false);
          expect(result2.unsubscribedAt).toBeInstanceOf(Date);
          expect(result2.subscribedAt).toBeUndefined();

          // User document should reflect unsubscribed state (back to original)
          const userAfterSecond = getUser();
          expect(userAfterSecond.isSubscribed).toBe(false);

          // Subscription document should be inactive
          const subAfterSecond = getSubscription();
          expect(subAfterSecond.isActive).toBe(false);
          expect(subAfterSecond.unsubscribedAt).toBeInstanceOf(Date);

          // ── Coin balance should be preserved through both toggles ──
          expect(userAfterSecond.coinBalance).toBe(initialCoinBalance);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.4**
   *
   * Property 9: Balance preservation across unsubscribe/resubscribe
   *
   * For any subscriber with a positive coin balance, unsubscribing SHALL
   * retain the existing balance unchanged, and resubscribing SHALL restore
   * access to that same balance. During the unsubscribed period, engagement
   * events SHALL not earn coins.
   */
  it('Property 9: balance preservation across unsubscribe/resubscribe', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUserId,
        fc.integer({ min: 1, max: 100000 }),
        async (userId, positiveCoinBalance) => {
          // ── Setup: user starts as subscribed with a positive coin balance ──
          const { service, getUser, getSubscription } = buildSubscriptionsService({
            userId,
            initialCoinBalance: positiveCoinBalance,
          });

          // First toggle: unsubscribed → subscribed (set up initial subscribed state)
          await service.toggleSubscription(userId);

          // Verify user is now subscribed with the original balance
          const userSubscribed = getUser();
          expect(userSubscribed.isSubscribed).toBe(true);
          expect(userSubscribed.coinBalance).toBe(positiveCoinBalance);

          // ── Step 1: Unsubscribe — balance should be retained ──
          const unsubResult = await service.toggleSubscription(userId);
          expect(unsubResult.isSubscribed).toBe(false);

          const userAfterUnsub = getUser();
          expect(userAfterUnsub.isSubscribed).toBe(false);
          // Balance must remain unchanged after unsubscribing (Req 5.3)
          expect(userAfterUnsub.coinBalance).toBe(positiveCoinBalance);

          // ── Step 2: During unsubscribed period, isSubscribed returns false ──
          // This means engagement events will not earn coins (Req 5.3)
          const subscribedDuringGap = await service.isSubscribed(userId);
          expect(subscribedDuringGap).toBe(false);

          // ── Step 3: Resubscribe — balance should be restored (Req 5.4) ──
          const resubResult = await service.toggleSubscription(userId);
          expect(resubResult.isSubscribed).toBe(true);

          const userAfterResub = getUser();
          expect(userAfterResub.isSubscribed).toBe(true);
          // Balance must be the same as before unsubscribing
          expect(userAfterResub.coinBalance).toBe(positiveCoinBalance);

          // ── Step 4: After resubscribe, isSubscribed returns true ──
          // This means coin earning is re-enabled (Req 5.4)
          const subscribedAfterResub = await service.isSubscribed(userId);
          expect(subscribedAfterResub).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });
});
