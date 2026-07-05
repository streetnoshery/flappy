# Requirements Document

## Introduction

This feature changes how coins are accumulated and made withdrawable in the Flappy platform. Currently, coins from all post engagements are pooled into a single global `coinBalance` on the user. This allows abuse: one user can like hundreds of posts from another user, inflating that user's coin balance and polluting the feed with low-quality, high-volume posting.

The new model tracks coins **per post**. A post must accumulate at least **1,000 coins** from engagements before those coins become withdrawable. Posts that never reach the threshold do not contribute to the user's withdrawable balance. The existing wallet system and coin transaction history are preserved and extended to support this model.

---

## Glossary

- **Post_Coin_Balance**: The total number of coins a specific post has accumulated from engagement events.
- **Coin_Threshold**: The minimum number of coins a post must accumulate (1,000) before its coins become withdrawable by the post owner.
- **Withdrawable_Balance**: The sum of coins from all posts that have individually reached the Coin_Threshold. This is the amount the user may convert and withdraw.
- **Pending_Balance**: Coins accumulated on posts that have not yet reached the Coin_Threshold. These coins are visible but not withdrawable.
- **Reward_Engine**: The backend service responsible for processing engagement events and crediting coins.
- **Wallet_Service**: The backend service responsible for managing withdrawable balance, conversion, and withdrawal operations.
- **Coin_Transaction**: An immutable ledger record of every coin credit, debit, conversion, or reversal event.
- **Post_Coin_Ledger**: A per-post record tracking the total coins accumulated and whether the Coin_Threshold has been reached.
- **Engager**: A subscribed user who performs a like or reaction on another user's post.
- **Post_Owner**: The subscribed user who created the post receiving engagement.
- **Conversion**: The act of converting coins from a threshold-reached post into a withdrawable monetary amount.

---

## Requirements

### Requirement 1: Per-Post Coin Tracking

**User Story:** As a post owner, I want my coins to be tracked per post, so that only posts that genuinely attract broad engagement contribute to my withdrawable balance.

#### Acceptance Criteria

1. WHEN an engagement event is processed and the Reward_Engine credits coins to the Post_Owner, THE Reward_Engine SHALL increment the Post_Coin_Balance for the specific post by the reward amount.
2. THE Post_Coin_Ledger SHALL store the `postId`, `ownerId`, `coinBalance`, `thresholdReached` flag, and `thresholdReachedAt` timestamp for each post.
3. WHEN the Post_Coin_Balance of a post reaches or exceeds the Coin_Threshold of 1,000 coins, THE Reward_Engine SHALL set the `thresholdReached` flag to `true` and record the `thresholdReachedAt` timestamp.
4. WHEN the Post_Coin_Balance of a post is below the Coin_Threshold, THE Reward_Engine SHALL NOT add those coins to the Post_Owner's Withdrawable_Balance.
5. THE Reward_Engine SHALL update the Post_Coin_Balance atomically to prevent race conditions from concurrent engagement events.

---

### Requirement 2: Withdrawable Balance Calculation

**User Story:** As a post owner, I want my withdrawable balance to reflect only coins from posts that have crossed the 1,000-coin threshold, so that I know exactly what I can withdraw.

#### Acceptance Criteria

1. THE Wallet_Service SHALL calculate the Withdrawable_Balance as the sum of Post_Coin_Balances from all posts where `thresholdReached` is `true`.
2. WHEN a post's `thresholdReached` flag transitions from `false` to `true`, THE Wallet_Service SHALL add that post's coin total to the Post_Owner's Withdrawable_Balance.
3. THE Wallet_Service SHALL expose the Withdrawable_Balance and Pending_Balance separately in the wallet summary response.
4. WHEN a user requests their wallet summary, THE Wallet_Service SHALL return the Withdrawable_Balance, Pending_Balance, and the count of posts that have reached the Coin_Threshold.
5. IF a post's coins are reversed (e.g., a like is undone) and the Post_Coin_Balance drops below the Coin_Threshold after previously reaching it, THEN THE Reward_Engine SHALL recalculate the Withdrawable_Balance and update it accordingly.

---

### Requirement 3: Coin Transaction History Preservation

**User Story:** As a post owner, I want to see a full history of coin transactions, so that I can audit how my coins were earned and which posts contributed to my balance.

#### Acceptance Criteria

1. THE Reward_Engine SHALL create a Coin_Transaction record for every coin credit event, including the `postId`, `amount`, `eventType`, and `relatedUserId`.
2. THE Coin_Transaction schema SHALL include a `postCoinBalanceAfter` field that records the Post_Coin_Balance of the post after the transaction is applied.
3. WHEN a post reaches the Coin_Threshold, THE Reward_Engine SHALL create a Coin_Transaction record with `eventType` set to `post_threshold_reached` for the Post_Owner.
4. THE Wallet_Service SHALL provide a paginated transaction history endpoint that returns Coin_Transaction records filtered by `userId`, sorted by `createdAt` descending.
5. WHERE a client requests transaction history filtered by post, THE Wallet_Service SHALL support filtering Coin_Transaction records by `relatedPostId`.

---

### Requirement 4: Threshold-Based Conversion and Withdrawal

**User Story:** As a post owner, I want to convert and withdraw coins only from posts that have reached 1,000 coins, so that the withdrawal system is fair and abuse-resistant.

#### Acceptance Criteria

1. WHEN a Post_Owner initiates a conversion, THE Wallet_Service SHALL only allow conversion of coins from posts where `thresholdReached` is `true`.
2. IF a Post_Owner attempts to convert coins from a post where `thresholdReached` is `false`, THEN THE Wallet_Service SHALL return an error with the reason `threshold_not_reached`.
3. WHEN a conversion is completed, THE Wallet_Service SHALL create a Coin_Transaction record with `eventType` set to `conversion` and deduct the converted amount from the Withdrawable_Balance.
4. THE Wallet_Service SHALL prevent double-conversion by marking a post's coins as `converted` after a successful conversion.
5. IF a Post_Owner attempts to convert coins from a post that has already been converted, THEN THE Wallet_Service SHALL return an error with the reason `already_converted`.

---

### Requirement 5: Abuse Prevention via Per-Post Isolation

**User Story:** As a platform operator, I want coin accumulation to be isolated per post, so that a single user liking many posts from the same person cannot inflate that person's withdrawable balance.

#### Acceptance Criteria

1. WHEN an Engager likes multiple posts from the same Post_Owner, THE Reward_Engine SHALL credit coins to each post's Post_Coin_Balance independently.
2. THE Reward_Engine SHALL apply the existing daily engagement rate limit (50 engagements per day per Engager) regardless of how many different posts are engaged with.
3. THE Reward_Engine SHALL apply the existing duplicate engagement prevention check per post, ensuring one Engager can only contribute coins to a given post once.
4. WHEN a post's Post_Coin_Balance is incremented, THE Reward_Engine SHALL NOT modify the Post_Owner's global `coinBalance` field directly; the Withdrawable_Balance is derived from Post_Coin_Ledger records only.
5. THE Abuse_Detector SHALL continue to apply farming detection logic across all engagement events, regardless of the per-post coin model.

---

### Requirement 6: Wallet Summary and Frontend Display

**User Story:** As a user, I want to see my wallet broken down by post performance, so that I understand which posts are earning me withdrawable coins and which are still accumulating.

#### Acceptance Criteria

1. THE Wallet_Service SHALL provide a wallet summary endpoint that returns: `withdrawableBalance`, `pendingBalance`, `thresholdReachedPostCount`, and `totalPostCount`.
2. THE Wallet_Service SHALL provide a per-post earnings endpoint that returns a list of posts with their `postId`, `coinBalance`, `thresholdReached` status, and `thresholdReachedAt` date.
3. WHEN a post's `thresholdReached` flag becomes `true`, THE Wallet_Service SHALL include that post in the list of posts eligible for conversion.
4. THE Wallet_Service SHALL sort the per-post earnings list by `coinBalance` descending by default.
5. WHERE pagination is requested, THE Wallet_Service SHALL support `page` and `pageSize` query parameters on the per-post earnings endpoint, with a default `pageSize` of 20.

---

### Requirement 7: Engagement Reversal Consistency

**User Story:** As a platform operator, I want coin reversals (e.g., when a like is undone) to correctly update the per-post coin balance, so that the ledger remains accurate.

#### Acceptance Criteria

1. WHEN an engagement is reversed, THE Reward_Engine SHALL decrement the Post_Coin_Balance for the affected post by the original reward amount.
2. IF a reversal causes the Post_Coin_Balance to drop below the Coin_Threshold after the threshold was previously reached, THEN THE Reward_Engine SHALL set `thresholdReached` to `false` and remove those coins from the Withdrawable_Balance.
3. WHEN an engagement is reversed, THE Reward_Engine SHALL create a Coin_Transaction record with `eventType` set to `engagement_reversed` and a negative `amount`.
4. THE Reward_Engine SHALL update the Post_Coin_Balance and the Withdrawable_Balance atomically during a reversal to prevent inconsistency.
5. IF a reversal is attempted on a post whose coins have already been converted, THEN THE Reward_Engine SHALL return an error with the reason `already_converted` and SHALL NOT modify the Post_Coin_Balance.
