# Implementation Plan: Per-Post Coin Rewards

## Overview

Migrate coin accumulation from a single global `User.coinBalance` to a per-post ledger (`PostCoinLedger`). Coins are tracked independently per post; a post must reach 1,000 coins before those coins become withdrawable. A new `WalletModule` exposes wallet summary, per-post earnings, conversion, and transaction history endpoints.

## Tasks

- [x] 1. Add `PostCoinLedger` Mongoose schema
  - Create `flappy_BE/src/rewards/schemas/post-coin-ledger.schema.ts`
  - Define fields: `postId` (string, required, indexed), `ownerId` (string, required, indexed), `coinBalance` (number, default 0), `thresholdReached` (boolean, default false), `thresholdReachedAt` (Date, optional), `converted` (boolean, default false), `convertedAt` (Date, optional), plus `createdAt`/`updatedAt` via `{ timestamps: true }`
  - Add compound indexes: `{ ownerId: 1, thresholdReached: 1 }` for wallet summary aggregation and `{ ownerId: 1, coinBalance: -1 }` for sorted per-post earnings list
  - Export `PostCoinLedger`, `PostCoinLedgerDocument`, and `PostCoinLedgerSchema`
  - Register the schema in `RewardsModule` (`MongooseModule.forFeature`)
  - _Requirements: 1.2, 1.5_

- [x] 2. Update `CoinTransaction` schema
  - Add `postCoinBalanceAfter` (number, optional) field to `flappy_BE/src/rewards/schemas/coin-transaction.schema.ts`
  - Add `'post_threshold_reached'` to the `eventType` enum alongside the four existing values
  - _Requirements: 3.2, 3.3_

- [x] 3. Update `RewardEngineService.processEngagement` to write to `PostCoinLedger`
  - Inject `PostCoinLedger` model into `RewardEngineService` (update constructor and `RewardsModule` providers)
  - Replace the `User.coinBalance` `$inc` call with an atomic `findOneAndUpdate` upsert on `PostCoinLedger` using `$inc: { coinBalance: OWNER_REWARD }` and `{ upsert: true, new: true }` — do NOT write to `User.coinBalance`
  - After the upsert, check if the returned document's `coinBalance >= COIN_THRESHOLD (1000)` and the previous balance was below threshold; if so, set `thresholdReached = true` and `thresholdReachedAt = new Date()` via a second `findOneAndUpdate`
  - Populate `postCoinBalanceAfter` on the `CoinTransaction` record created for the post owner
  - When the threshold is just crossed, create an additional `CoinTransaction` with `eventType: 'post_threshold_reached'`, `amount: 0`, `relatedPostId`, and `postCoinBalanceAfter`
  - Update `RewardResult` interface to include `postCoinBalance?: number` and `thresholdJustReached?: boolean`
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 5.4_

- [x] 4. Update `RewardEngineService.reverseEngagement` to handle `PostCoinLedger` and converted guard
  - At the start of `reverseEngagement`, fetch the `PostCoinLedger` record for the given `postId`; if `converted` is `true`, return `{ rewarded: false, reason: 'already_converted' }` without modifying any balance
  - Replace the `User.coinBalance` `$inc` deduction with an atomic `findOneAndUpdate` on `PostCoinLedger` using `$inc: { coinBalance: -OWNER_REWARD }` and `{ new: true }`
  - After the decrement, if the new `coinBalance < COIN_THRESHOLD` and `thresholdReached` was `true`, set `thresholdReached = false` via `$set`
  - Populate `postCoinBalanceAfter` on the reversal `CoinTransaction` record
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write unit tests for updated `RewardEngineService`
  - Update `flappy_BE/src/rewards/__tests__/reward-engine.unit.spec.ts`
  - Add mock for `postCoinLedgerModel` with `findOneAndUpdate` tracking (upsert path and threshold-crossing path)
  - Add test: `processEngagement` writes to `PostCoinLedger`, NOT to `User.coinBalance`
  - Add test: threshold flag is set when `coinBalance` crosses 1,000 (simulate balance going from 998 to 1000)
  - Add test: `post_threshold_reached` transaction is created exactly once when threshold is crossed
  - Add test: `post_threshold_reached` transaction is NOT created when threshold is not yet reached
  - Add test: `reverseEngagement` returns `already_converted` when `PostCoinLedger.converted` is `true`
  - Add test: `reverseEngagement` sets `thresholdReached = false` when balance drops below threshold
  - Add test: `postCoinBalanceAfter` is populated on every created `CoinTransaction`
  - _Requirements: 1.1, 1.3, 3.2, 3.3, 7.5_

  - [ ]* 6.1 Write property test — Property 1: Per-post coin balance grows by exactly OWNER_REWARD
    - File: `flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts`
    - For any eligible engagement (both parties subscribed, abuse check passes, distinct users), the `PostCoinLedger` upsert `$inc` amount SHALL equal exactly `OWNER_REWARD`
    - Mock `postCoinLedgerModel.findOneAndUpdate` to capture the `$inc` value and assert it equals `OWNER_REWARD` for every run
    - **Property 1: Per-post coin balance grows by exactly OWNER_REWARD on each eligible engagement**
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 6.2 Write property test — Property 2: Threshold flag ↔ coinBalance ≥ 1,000
    - File: `flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts`
    - Generate arbitrary `coinBalance` values (0–2000) and simulate the threshold-check logic; assert `thresholdReached` is `true` iff `coinBalance >= 1000`
    - **Property 2: Threshold flag is set if and only if coinBalance ≥ 1,000**
    - **Validates: Requirements 1.3, 1.4, 2.1, 2.2**

  - [ ]* 6.3 Write property test — Property 3: Engagement reversal is the exact inverse
    - File: `flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts`
    - For any eligible engagement followed by its reversal, the net `$inc` sum applied to `PostCoinLedger.coinBalance` SHALL be zero
    - **Property 3: Engagement reversal is the exact inverse of engagement processing**
    - **Validates: Requirements 7.1, 7.4**

  - [ ]* 6.4 Write property test — Property 5: CoinTransaction records are complete and well-formed
    - File: `flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts`
    - For any eligible engagement, every created `CoinTransaction` SHALL have non-empty `userId`, non-zero `amount`, valid `eventType`, non-empty `relatedPostId`, and a numeric `postCoinBalanceAfter`
    - **Property 5: CoinTransaction records are complete and well-formed**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 6.5 Write property test — Property 7: Reversal on a converted post is rejected
    - File: `flappy_BE/src/rewards/__tests__/reward-engine.property.spec.ts`
    - For any post where `PostCoinLedger.converted = true`, any reversal attempt SHALL return `{ rewarded: false, reason: 'already_converted' }` and SHALL NOT call `postCoinLedgerModel.findOneAndUpdate` with a `$inc` operation
    - **Property 7: Reversal on a converted post is rejected**
    - **Validates: Requirements 7.5**

- [x] 7. Create `WalletModule` with `WalletService`
  - Create directory `flappy_BE/src/wallet/`
  - Create `flappy_BE/src/wallet/wallet.service.ts` with the following methods:
    - `getWalletSummary(userId: string): Promise<WalletSummary>` — aggregate `PostCoinLedger` for the user: sum `coinBalance` where `thresholdReached = true` for `withdrawableBalance`; sum `coinBalance` where `thresholdReached = false` for `pendingBalance`; count records for `totalPostCount` and `thresholdReachedPostCount`
    - `getPostEarnings(userId: string, page: number, pageSize: number): Promise<PaginatedPostEarnings>` — query `PostCoinLedger` where `ownerId = userId`, sort by `coinBalance` descending, apply skip/limit pagination
    - `convertPostCoins(userId: string, postId: string): Promise<ConversionResult>` — fetch ledger record; return 404 if not found; return 403 if `ownerId !== userId`; return 422 (`threshold_not_reached`) if `thresholdReached = false`; return 409 (`already_converted`) if `converted = true`; atomically set `converted = true`, `convertedAt = new Date()`; create `CoinTransaction` with `eventType: 'conversion'`
    - `getTransactionHistory(userId: string, page: number, pageSize: number, relatedPostId?: string): Promise<PaginatedTransactions>` — query `CoinTransaction` by `userId` (and optionally `relatedPostId`), sort by `createdAt` descending, apply skip/limit
  - Define and export interfaces: `WalletSummary`, `PostEarning`, `PaginatedPostEarnings`, `ConversionResult`, `PaginatedTransactions`
  - Create `flappy_BE/src/wallet/wallet.module.ts` — import `MongooseModule.forFeature` for `PostCoinLedger` and `CoinTransaction` schemas; import `RewardsModule` if needed for schema access; provide and export `WalletService`
  - _Requirements: 2.1, 2.3, 2.4, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.4, 6.5_

- [x] 8. Create `WalletController` with 4 endpoints
  - Create `flappy_BE/src/wallet/wallet.controller.ts`
  - `GET /wallet/summary` — calls `walletService.getWalletSummary(req.user.userId)`; returns `WalletSummary`
  - `GET /wallet/posts` — accepts optional `?page=` and `?pageSize=` query params (defaults: page=1, pageSize=20); calls `walletService.getPostEarnings(...)`; returns `PaginatedPostEarnings`
  - `POST /wallet/convert/:postId` — calls `walletService.convertPostCoins(req.user.userId, postId)`; returns `ConversionResult`; maps service errors to appropriate HTTP status codes (422, 409, 404, 403)
  - `GET /wallet/transactions` — accepts optional `?page=`, `?pageSize=`, and `?postId=` query params; calls `walletService.getTransactionHistory(...)`; returns `PaginatedTransactions`
  - Apply `JwtAuthGuard` (already global) — no additional guard needed
  - Register `WalletController` in `WalletModule`
  - _Requirements: 2.3, 2.4, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Register `WalletModule` in `AppModule`
  - `AppModule` already imports `WalletModule` — verify the import is present and the module resolves without errors after the new files are created
  - Confirm `WalletModule` exports `WalletService` if any other module needs it
  - _Requirements: 6.1, 6.2_

- [x] 10. Write unit tests for `WalletService`
  - Create `flappy_BE/src/wallet/__tests__/wallet.service.unit.spec.ts`
  - Mock `postCoinLedgerModel` and `coinTransactionModel` with in-memory tracking (same pattern as `reward-engine.unit.spec.ts`)
  - Add test: `getWalletSummary` returns `withdrawableBalance = 0` and `pendingBalance = 0` for a user with no posts
  - Add test: `getWalletSummary` sums only threshold-reached posts into `withdrawableBalance`
  - Add test: `getWalletSummary` sums only non-threshold posts into `pendingBalance`
  - Add test: `getWalletSummary` returns correct `thresholdReachedPostCount` and `totalPostCount`
  - Add test: `convertPostCoins` returns `threshold_not_reached` when `thresholdReached = false`
  - Add test: `convertPostCoins` returns `already_converted` when `converted = true`
  - Add test: `convertPostCoins` returns `not_post_owner` (403) when `ownerId !== userId`
  - Add test: `convertPostCoins` returns `post_not_found` (404) when ledger record does not exist
  - Add test: `convertPostCoins` sets `converted = true` and creates a `conversion` `CoinTransaction` on success
  - Add test: `getTransactionHistory` returns records sorted by `createdAt` descending with correct pagination
  - Add test: `getTransactionHistory` filters by `relatedPostId` when provided
  - Add test: `getPostEarnings` returns posts sorted by `coinBalance` descending with correct pagination
  - _Requirements: 2.1, 2.3, 2.4, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.4, 6.5_

  - [ ]* 10.1 Write property test — Property 4: Withdrawable balance equals sum of threshold-reached post balances
    - File: `flappy_BE/src/wallet/__tests__/wallet.service.property.spec.ts`
    - Generate arbitrary arrays of `PostCoinLedger`-like objects with random `coinBalance` and `thresholdReached` values; assert `getWalletSummary` returns `withdrawableBalance` equal to the sum of `coinBalance` for records where `thresholdReached = true`
    - **Property 4: Withdrawable balance equals sum of threshold-reached post balances**
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [ ]* 10.2 Write property test — Property 6: Conversion is idempotent — a converted post cannot be converted again
    - File: `flappy_BE/src/wallet/__tests__/wallet.service.property.spec.ts`
    - For any post with `thresholdReached = true` and `converted = true`, any call to `convertPostCoins` SHALL return `{ success: false, reason: 'already_converted' }` and SHALL NOT call `postCoinLedgerModel.findOneAndUpdate` with a `$set: { converted: true }` operation
    - **Property 6: Conversion is idempotent — a converted post cannot be converted again**
    - **Validates: Requirements 4.4, 4.5**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The `User.coinBalance` field is intentionally left in the schema (additive change) — the reward engine stops writing to it; the wallet service ignores it
- `COIN_THRESHOLD = 1000` should be defined as a named constant in `reward-engine.service.ts` alongside `OWNER_REWARD`
- The `AppModule` already imports `WalletModule` — task 9 is a verification step
- Property tests use `fast-check` v4.7.0 (already installed); run with `npx jest --testPathPattern=property --run` or equivalent
- Checkpoints ensure incremental validation after each major phase
