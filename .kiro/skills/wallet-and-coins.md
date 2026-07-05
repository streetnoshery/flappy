# Wallet & Coin System

## How Coins Work

### Flow
1. User A (subscribed) likes/reacts to User B's (subscribed) post
2. `InteractionsService` or `ReactionsService` calls `RewardEngineService.processEngagement()`
3. `RewardEngineService` runs checks: both subscribed? abuse check passes?
4. If eligible: `PostCoinLedger` for that post gets `+2 coins` (OWNER_REWARD = 2)
5. A `CoinTransaction` record is created with `eventType: 'engagement_received'`
6. When a post hits 1,000 coins: `thresholdReached = true`, extra transaction created

### What blocks coin credit
- Engager not subscribed → `not_subscribed`
- Post owner not subscribed → `not_subscribed`
- Self-like (engagerId === postOwnerId) → `self_engagement`
- Flagged account → `flagged`
- Duplicate engagement (same user + same post) → `duplicate`
- Daily rate limit (50/day) → `rate_limit`

## Key Constants
```typescript
OWNER_REWARD = 2      // coins per eligible engagement
COIN_THRESHOLD = 1000 // coins needed before post is withdrawable
```

## PostCoinLedger Schema
```
postId          — MongoDB _id of the post (string)
ownerId         — post.userId (custom userId string, e.g. "user_abc123")
coinBalance     — total coins accumulated
thresholdReached — true when coinBalance >= 1000
thresholdReachedAt — when threshold was first crossed
converted       — true after owner converts this post's coins
convertedAt     — when conversion happened
```

## CoinTransaction eventTypes
| eventType | When created |
|---|---|
| `engagement_received` | Post owner receives coins from a like/reaction |
| `engagement_reversed` | Like/reaction undone — negative amount |
| `post_threshold_reached` | Post hits 1,000 coins — amount: 0 |
| `conversion` | Owner converts a post's coins |
| `engagement_earned` | (legacy) engager side — not used in current engine |

## Wallet API Endpoints
| Method | Route | Description |
|---|---|---|
| GET | `/wallet/summary` | withdrawableBalance, pendingBalance, counts |
| GET | `/wallet/posts` | Per-post earnings list, sorted by coinBalance desc |
| GET | `/wallet/posts/:postId/coins` | Single post coin balance (for badge) |
| POST | `/wallet/convert/:postId` | Convert a threshold-reached post's coins |
| GET | `/wallet/transactions` | Paginated transaction history, optional `?postId=` |

## Wallet Summary Logic
1. Check `PostCoinLedger` for records where `ownerId = userId`
2. If records exist → sum them (withdrawable = thresholdReached, pending = not)
3. If NO records (legacy data) → look up user's posts, aggregate `CoinTransaction` by postId

## Fallback for Legacy Data
Old coins (before PostCoinLedger was deployed) live in `CoinTransaction` records.
The wallet service falls back to aggregating these by post ID when no ledger records exist.
New engagements always create `PostCoinLedger` records.

## Adding Coins to a New Action
If you want a new action (e.g. comment, share) to award coins:

**Backend** — in the relevant service:
```typescript
await this.rewardEngineService.processEngagement({
  engagerId: userId,
  postId: post._id.toString(),
  postOwnerId: post.userId,  // MUST be post.userId, not _id
  eventType: 'like',         // use 'like' or 'reaction'
});
```

**Important**: `postOwnerId` must be the custom `userId` string (e.g. `"user_abc123"`),
not the MongoDB ObjectId. This is what gets stored as `PostCoinLedger.ownerId` and
must match `req.user.userId` from the JWT for the wallet to show correct balances.

## Coin Badge on PostCard
- Only visible when `user.userId === post.userId?.userId`
- Fetches `/wallet/posts/:postId/coins` with `staleTime: 30000`
- Amber = accumulating toward 1,000
- Green = threshold reached, ready to convert
- Query key: `['postCoins', post._id]`

## Conversion Flow
1. User clicks Convert on a post in `/wallet` page
2. `POST /wallet/convert/:postId` called
3. Backend checks: ledger exists? owner matches? thresholdReached? not already converted?
4. Atomically sets `converted = true`, creates `conversion` CoinTransaction
5. Frontend invalidates `walletSummary`, `postEarnings`, `walletTransactions` queries

## Error Reasons from Conversion
| Reason | HTTP | Meaning |
|---|---|---|
| `threshold_not_reached` | 422 | Post has < 1,000 coins |
| `already_converted` | 409 | Post coins already converted |
| `post_not_found` | 404 | No ledger record for this post+owner |
| `not_post_owner` | 403 | Post belongs to someone else |
