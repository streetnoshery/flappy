# Implementation Plan: Subscription-Based Engagement & Rewards System

## Overview

This plan implements a subscription-based rewards system for the Flappy platform. It adds three new backend modules (`subscriptions`, `rewards`, `wallet`), extends the existing `User` schema, hooks reward processing into the existing engagement flow, and builds frontend components for subscription management and the wallet dashboard. Tasks are ordered so each step builds on the previous, with checkpoints for incremental validation.

## Tasks

- [x] 1. Extend User schema and set up Subscriptions module
  - [x] 1.1 Add subscription and reward fields to the User schema
    - Add `coinBalance` (number, default 0), `isSubscribed` (boolean, default false), `subscribedAt` (Date, optional), and `rewardsSuspended` (boolean, default false) fields to `flappy_BE/src/users/schemas/user.schema.ts`
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3_

  - [x] 1.2 Create the Subscription schema and SubscriptionsModule
    - Create `flappy_BE/src/subscriptions/schemas/subscription.schema.ts` with `userId` (unique), `isActive`, `subscribedAt`, `unsubscribedAt` fields
    - Create `flappy_BE/src/subscriptions/subscriptions.module.ts` importing MongooseModule for Subscription and User schemas, exporting `SubscriptionsService`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.3 Implement SubscriptionsService
    - Create `flappy_BE/src/subscriptions/subscriptions.service.ts` with `toggleSubscription(userId)`, `isSubscribed(userId)`, and `getSubscriptionStatus(userId)` methods
    - `toggleSubscription` must update both the Subscription document and the User document's `isSubscribed`/`subscribedAt` fields atomically
    - `getSubscriptionStatus` must return `isSubscribed`, `subscribedAt`, and `coinBalance`
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 5.3, 5.4_

  - [x] 1.4 Create SubscriptionsController with toggle and status endpoints
    - Create `flappy_BE/src/subscriptions/subscriptions.controller.ts` with `POST /subscriptions/toggle` and `GET /subscriptions/status/:userId` endpoints
    - Follow existing controller logging patterns (structured console.log with emoji prefixes)
    - _Requirements: 1.2, 1.6_

  - [x] 1.5 Register SubscriptionsModule in AppModule
    - Import `SubscriptionsModule` in `flappy_BE/src/app.module.ts`
    - _Requirements: 1.2_

  - [x] 1.6 Write property test for subscription toggle round-trip
    - **Property 1: Subscription toggle round-trip**
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 2. Checkpoint - Ensure subscription module compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Rewards module with RewardEngine and AbuseDetector
  - [x] 3.1 Create CoinTransaction schema
    - Create `flappy_BE/src/rewards/schemas/coin-transaction.schema.ts` with `userId`, `amount`, `eventType` (enum: engagement_earned, engagement_received, engagement_reversed, conversion), `relatedPostId`, `relatedUserId`, `description` fields
    - Add compound index `{ userId: 1, createdAt: -1 }` for efficient paginated queries
    - _Requirements: 2.6, 3.2, 3.3_

  - [x] 3.2 Create AbuseFlag and DailyEngagementCount schemas
    - Create `flappy_BE/src/rewards/schemas/abuse-flag.schema.ts` with `userId`, `reason`, `status` (enum: pending_review, resolved, confirmed), `resolvedAt` fields
    - Create `flappy_BE/src/rewards/schemas/daily-engagement-count.schema.ts` with `userId`, `date` (YYYY-MM-DD string), `count` fields and unique compound index `{ userId: 1, date: 1 }`
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 3.3 Implement AbuseDetectorService
    - Create `flappy_BE/src/rewards/abuse-detector.service.ts` with `checkEngagement(engagerId, postId, postOwnerId)`, `flagAccount(userId, reason)`, and `isAccountFlagged(userId)` methods
    - Implement daily rate limit check using DailyEngagementCount (max rewarded engagements per day)
    - Implement duplicate engagement prevention (same user + same post)
    - Implement self-engagement prevention (engager === postOwner)
    - Implement flagged account check
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 3.4 Implement RewardEngineService
    - Create `flappy_BE/src/rewards/reward-engine.service.ts` with `processEngagement(event)` and `reverseEngagement(event)` methods
    - `processEngagement` must: check both parties are subscribers via SubscriptionsService, run AbuseDetectorService checks, credit coins to both engager and post owner using atomic `$inc`, record CoinTransaction entries in the ledger
    - `reverseEngagement` must: deduct previously awarded coins from both parties and record reversal transactions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2_

  - [x] 3.5 Create RewardsModule
    - Create `flappy_BE/src/rewards/rewards.module.ts` importing MongooseModule for CoinTransaction, AbuseFlag, DailyEngagementCount, User, Post, and Subscription schemas
    - Import SubscriptionsModule for subscriber checks
    - Export RewardEngineService for use by InteractionsModule and ReactionsModule
    - _Requirements: 2.1, 2.2_

  - [x] 3.6 Register RewardsModule in AppModule
    - Import `RewardsModule` in `flappy_BE/src/app.module.ts`
    - _Requirements: 2.1_

  - [x] 3.7 Write property test for dual reward on eligible engagement
    - **Property 2: Dual reward on eligible engagement**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 3.8 Write property test for eligibility gate
    - **Property 3: Eligibility gate — coins only when both parties are subscribers**
    - **Validates: Requirements 2.3, 2.4, 5.1, 5.2, 6.6**

  - [x] 3.9 Write property test for engagement reversal
    - **Property 4: Engagement reversal restores balances**
    - **Validates: Requirements 2.5**

  - [x] 3.10 Write property test for ledger entry completeness
    - **Property 5: Ledger entry completeness**
    - **Validates: Requirements 2.6, 3.3**

  - [x] 3.11 Write property test for daily rate limit enforcement
    - **Property 10: Daily rate limit enforcement**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 3.12 Write property test for duplicate engagement prevention
    - **Property 11: Duplicate engagement prevention**
    - **Validates: Requirements 6.3**

  - [x] 3.13 Write property test for flagged account suspension
    - **Property 12: Flagged account suspension**
    - **Validates: Requirements 6.5**

- [x] 4. Checkpoint - Ensure rewards module compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Hook RewardEngine into existing engagement flow
  - [x] 5.1 Integrate RewardEngine into InteractionsService (likes)
    - Import RewardsModule in InteractionsModule
    - Inject `RewardEngineService` into `InteractionsService`
    - After a successful like in `likePost()`, call `rewardEngine.processEngagement()` with the engager ID, post ID, and post owner ID
    - After a successful unlike in `likePost()`, call `rewardEngine.reverseEngagement()` to deduct coins
    - _Requirements: 2.1, 2.2, 2.5, 5.1, 5.2_

  - [x] 5.2 Integrate RewardEngine into ReactionsService (reactions)
    - Import RewardsModule in ReactionsModule
    - Inject `RewardEngineService` into `ReactionsService`
    - After a new reaction in `reactToPost()`, call `rewardEngine.processEngagement()`
    - After a reaction removal (toggle off) in `reactToPost()`, call `rewardEngine.reverseEngagement()`
    - When a reaction is changed (different type), no additional reward processing needed (already rewarded on first react)
    - _Requirements: 2.1, 2.2, 2.5, 5.1, 5.2_

  - [x] 5.3 Write property test for balance preservation across unsubscribe/resubscribe
    - **Property 9: Balance preservation across unsubscribe/resubscribe**
    - **Validates: Requirements 5.3, 5.4**

- [x] 6. Implement Wallet module with balance, history, and conversion
  - [x] 6.1 Create ConversionRecord schema
    - Create `flappy_BE/src/wallet/schemas/conversion-record.schema.ts` with `userId`, `coinsConverted`, `conversionRate`, `payoutAmount`, `status` (enum: pending, processing, completed, failed) fields
    - _Requirements: 4.5, 4.6_

  - [x] 6.2 Implement WalletService
    - Create `flappy_BE/src/wallet/wallet.service.ts` with `getBalance(userId)`, `getTransactions(userId, page, limit)`, `requestConversion(userId, amount)`, and `getThresholds()` methods
    - `getTransactions` must return paginated results sorted by `createdAt` descending
    - `requestConversion` must verify coin balance meets `Coin_Threshold`, verify engagement threshold from distinct subscribers, atomically deduct coins and create ConversionRecord, and record a debit CoinTransaction
    - Return appropriate error messages when thresholds are not met
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.3 Create WalletController
    - Create `flappy_BE/src/wallet/wallet.controller.ts` with `GET /wallet/balance`, `GET /wallet/transactions`, `POST /wallet/convert`, and `GET /wallet/thresholds` endpoints
    - Add subscription check guard — return 403 for non-subscribers on all wallet endpoints
    - Follow existing controller logging patterns
    - _Requirements: 3.1, 3.2, 4.1, 4.7, 5.5_

  - [x] 6.4 Create WalletModule and register in AppModule
    - Create `flappy_BE/src/wallet/wallet.module.ts` importing MongooseModule for ConversionRecord, CoinTransaction, User, and Subscription schemas
    - Import SubscriptionsModule and RewardsModule
    - Register WalletModule in `flappy_BE/src/app.module.ts`
    - _Requirements: 3.1, 4.1_

  - [x] 6.5 Write property test for transaction history sort order
    - **Property 6: Transaction history sort order**
    - **Validates: Requirements 3.2**

  - [x] 6.6 Write property test for conversion eligibility check
    - **Property 7: Conversion eligibility check**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 6.7 Write property test for conversion execution correctness
    - **Property 8: Conversion execution correctness**
    - **Validates: Requirements 4.5, 4.6**

- [x] 7. Checkpoint - Ensure all backend modules compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update User Profile API to include subscription fields
  - [x] 8.1 Update UsersController and UsersService to return subscription fields
    - Modify `findById` in `UsersService` to include `isSubscribed`, `subscribedAt` in all profile responses
    - When the requesting user is viewing their own profile, include `coinBalance` in the response
    - Update `GET /users/:id` endpoint to accept a `viewerId` query parameter to determine own-profile vs other-profile
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.2 Write property test for profile API subscription fields completeness
    - **Property 13: Profile API subscription fields completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 9. Build frontend SubscribeButton component
  - [x] 9.1 Create SubscribeButton component
    - Create `flappy_FE/src/components/subscription/SubscribeButton.js`
    - Display "Subscribe" when the viewing user is not subscribed, "Subscribed" when already subscribed
    - On click, call `POST /subscriptions/toggle` and update button state from the API response
    - _Requirements: 1.1, 1.5_

  - [x] 9.2 Integrate SubscribeButton into the Profile page
    - Add `SubscribeButton` to the existing Profile page (`flappy_FE/src/pages/Profile.js`)
    - Display on every user profile page for authenticated users
    - _Requirements: 1.1, 1.5_

- [x] 10. Build frontend Wallet Dashboard
  - [x] 10.1 Create CoinBalanceDisplay component
    - Create `flappy_FE/src/components/wallet/CoinBalanceDisplay.js`
    - Display the subscriber's current coin balance
    - _Requirements: 3.1_

  - [x] 10.2 Create TransactionList component
    - Create `flappy_FE/src/components/wallet/TransactionList.js`
    - Display a paginated list of coin transactions sorted by most recent first
    - Show amount, event type, related post ID, and timestamp for each entry
    - _Requirements: 3.2, 3.3_

  - [x] 10.3 Create ConversionForm component
    - Create `flappy_FE/src/components/wallet/ConversionForm.js`
    - Display current Coin_Threshold and Engagement_Threshold values with progress indicators
    - Allow subscriber to input conversion amount and submit conversion request
    - Display error messages when thresholds are not met
    - _Requirements: 4.1, 4.3, 4.4, 4.7_

  - [x] 10.4 Create Wallet page and add route
    - Create `flappy_FE/src/pages/Wallet.js` composing CoinBalanceDisplay, TransactionList, and ConversionForm
    - For non-subscribers, display a message indicating subscription is required and restrict access to conversion features
    - Add `/wallet` route to `flappy_FE/src/App.js` as a protected route
    - _Requirements: 3.1, 3.4, 4.7, 5.5_

- [x] 11. Implement engagement farming detection
  - [x] 11.1 Add engagement farming detection logic to AbuseDetectorService
    - Implement pattern detection for reciprocal engagement between a small set of subscribers
    - Track engagement graph edges (engager → post owner) and flag accounts where engagement is concentrated among a small closed group
    - When flagged, call `flagAccount()` to suspend coin earning until manual review
    - _Requirements: 6.4, 6.5_

  - [x] 11.2 Write unit tests for engagement farming detection
    - Test specific graph patterns: two users exclusively engaging with each other, small ring of 3-4 users
    - Test that legitimate diverse engagement is not flagged
    - _Requirements: 6.4, 6.5_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses TypeScript (NestJS + Mongoose), the frontend uses JavaScript (React)
- `fast-check` is already installed as a dev dependency for property-based testing
- Property test files follow the pattern established in `flappy_BE/src/feed/__tests__/`
