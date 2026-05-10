# Flappy Project Overview

## What is Flappy?
A social media platform (Instagram/Twitter-style) with a coin rewards system. Users post content, engage with others' posts (likes/reactions), and earn coins that can be converted to money.

## Monorepo Structure
```
flappy/
├── flappy_BE/          # NestJS backend (TypeScript)
├── flappy_FE/          # React frontend (JavaScript)
├── .kiro/specs/        # Feature specs (requirements, design, tasks)
└── deploy/             # Deployment scripts
```

## Backend — flappy_BE
- **Framework**: NestJS 10 + TypeScript
- **Database**: MongoDB via Mongoose (@nestjs/mongoose)
- **Auth**: JWT (passport-jwt), OTP email verification
- **Port**: 3001 (default)
- **Run**: `npm run start:dev` from `flappy_BE/`
- **Test**: `npx jest --runInBand` from `flappy_BE/`
- **Build**: `npx tsc --noEmit` to type-check

### Key Modules
| Module | Path | Purpose |
|---|---|---|
| AuthModule | `src/auth/` | JWT login, OTP, password reset |
| UsersModule | `src/users/` | User profiles, coinBalance (deprecated) |
| PostsModule | `src/posts/` | CRUD for posts |
| FeedModule | `src/feed/` | Home/trending/following/explore feeds |
| InteractionsModule | `src/interactions/` | Likes, comments, bookmarks |
| ReactionsModule | `src/reactions/` | Emoji reactions on posts |
| RewardsModule | `src/rewards/` | Coin engine, abuse detection |
| WalletModule | `src/wallet/` | Wallet summary, per-post earnings, conversion |
| SubscriptionsModule | `src/subscriptions/` | Subscription status |
| FollowModule | `src/follow/` | Follow/unfollow, follow cache |
| SearchModule | `src/search/` | User and post search |

### Key Schemas (MongoDB collections)
| Schema | File | Key Fields |
|---|---|---|
| User | `src/users/schemas/user.schema.ts` | `userId` (custom string), `email`, `username`, `coinBalance` (deprecated), `isSubscribed` |
| Post | `src/posts/schemas/post.schema.ts` | `userId` (owner's custom userId), `content`, `type`, `hashtags` |
| PostCoinLedger | `src/rewards/schemas/post-coin-ledger.schema.ts` | `postId`, `ownerId` (= Post.userId), `coinBalance`, `thresholdReached`, `converted` |
| CoinTransaction | `src/rewards/schemas/coin-transaction.schema.ts` | `userId`, `amount`, `eventType`, `relatedPostId`, `postCoinBalanceAfter` |
| Like | `src/interactions/schemas/like.schema.ts` | `postId`, `userId` |
| Reaction | `src/reactions/schemas/reaction.schema.ts` | `postId`, `userId`, `type` |

### Important Conventions
- **User identity**: Always use `user.userId` (custom string like `"user_abc123"`), NOT MongoDB `_id`
- **JWT payload**: `req.user.userId` in controllers (set by JwtStrategy)
- **Self-engagement**: Blocked in AbuseDetectorService — `engagerId === postOwnerId` → no coins
- **Coins per engagement**: `OWNER_REWARD = 2` coins per like/reaction
- **Withdrawal threshold**: `COIN_THRESHOLD = 1000` coins per post before withdrawable
- **Global guard**: `JwtAuthGuard` applied globally — use `@Public()` decorator to skip

## Frontend — flappy_FE
- **Framework**: React 18 (Create React App, JavaScript)
- **Routing**: react-router-dom v6
- **Data fetching**: react-query v3 (`useQuery`, `useMutation`)
- **HTTP client**: axios (via `src/services/api.js`)
- **Styling**: Tailwind CSS v3
- **Icons**: lucide-react
- **Toasts**: react-hot-toast
- **Port**: 3000 (default)
- **Run**: `npm start` from `flappy_FE/`

### Key Files
| File | Purpose |
|---|---|
| `src/services/api.js` | All API calls — single source of truth for endpoints |
| `src/contexts/AuthContext.js` | Auth state, `useAuth()` hook → `user.userId` |
| `src/contexts/FeatureFlagsContext.js` | Feature flag checks |
| `src/components/PostCard.js` | Single post card with likes, comments, coin badge |
| `src/pages/Wallet.js` | Wallet page — summary + post earnings + transactions |
| `src/components/wallet/` | CoinBalanceDisplay, PostEarningsList, TransactionList |
| `src/App.js` | Routes definition |

### API Service Groups (src/services/api.js)
- `authAPI` — login, signup, OTP, password reset
- `usersAPI` — profile, follow, stats
- `postsAPI` — CRUD posts
- `feedAPI` — home/following/trending/explore/reels feeds
- `interactionsAPI` — like, comment, bookmark
- `reactionsAPI` — emoji reactions
- `walletAPI` — summary, post earnings, transactions, convert
- `subscriptionsAPI` — toggle, status
- `searchAPI` — users and posts search
- `featureFlagsAPI` — enabled features

### Coin Badge on Posts
- Shown only when `user.userId === post.userId?.userId` (own posts only)
- Fetches `GET /wallet/posts/:postId/coins`
- Amber badge = accumulating, green badge = threshold reached (ready to convert)

## Wallet System (Per-Post Coins)
- Coins tracked per post in `PostCoinLedger`
- `pendingBalance` = sum of posts with `coinBalance < 1000`
- `withdrawableBalance` = sum of posts with `thresholdReached = true`
- Fallback: if no `PostCoinLedger` records, aggregates from `CoinTransaction` by post IDs
- Conversion: `POST /wallet/convert/:postId` — marks post as converted, creates transaction

## Testing
- **Framework**: Jest + ts-jest
- **Property tests**: fast-check v4.7.0
- **Pattern**: `Object.create(Service.prototype)` + `Object.assign` to bypass NestJS DI
- **Run all**: `npx jest --runInBand` from `flappy_BE/`
- **Run specific**: `npx jest --testPathPattern="wallet" --runInBand`
- **Property tests only**: `npx jest --testPathPattern="property" --runInBand`

## Environment Variables
- **Backend** (`flappy_BE/.env`): `MONGODB_URI`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`, AWS S3 keys, email config
- **Frontend** (`flappy_FE/.env`): `REACT_APP_API_URL` (defaults to `http://localhost:3001`)
