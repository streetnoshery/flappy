# Dev Commands & Workflows

## Starting the App

### Backend
```bash
cd flappy_BE
npm run start:dev        # watch mode (auto-restart on changes)
npm run start            # single run
npm run start:prod       # production (from dist/)
```
Backend runs on http://localhost:3001

### Frontend
```bash
cd flappy_FE
npm start                # development server
npm run build            # production build
```
Frontend runs on http://localhost:3000

## Testing (Backend)

```bash
cd flappy_BE

# Run all tests (use --runInBand — property tests need sequential execution)
npx jest --runInBand

# Run specific module tests
npx jest --testPathPattern="rewards" --runInBand
npx jest --testPathPattern="wallet" --runInBand
npx jest --testPathPattern="feed" --runInBand

# Run only property-based tests
npx jest --testPathPattern="property" --runInBand

# Run only unit tests
npx jest --testPathPattern="unit" --runInBand

# Run with coverage
npx jest --runInBand --coverage

# Type-check without running (fast)
npx tsc --noEmit
```

## Building (Backend)
```bash
cd flappy_BE
npm run build            # compiles TypeScript to dist/
npx tsc --noEmit         # type-check only (no output)
```

## Deployment
```bash
# Full deploy (from root)
./deploy.sh

# Backend only
./deploy/deploy-backend.sh

# Frontend only
./deploy/deploy-frontend.sh

# Redeploy (restart services)
./deploy/redeploy.sh
```

## Useful API Test Commands
```bash
# Login and get token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Get wallet summary (replace TOKEN)
curl http://localhost:3001/wallet/summary \
  -H "Authorization: Bearer TOKEN"

# Get post coins
curl http://localhost:3001/wallet/posts/POST_ID/coins \
  -H "Authorization: Bearer TOKEN"

# Get transaction history
curl "http://localhost:3001/wallet/transactions?page=1&pageSize=10" \
  -H "Authorization: Bearer TOKEN"
```

## MongoDB Quick Checks
If you need to inspect data directly, the connection string is in `flappy_BE/.env` as `MONGODB_URI`.

Key collections:
- `postcoinledgers` — per-post coin balances
- `cointransactions` — full transaction history
- `users` — user accounts (coinBalance field is deprecated)
- `posts` — post content
- `likes` — like records
- `reactions` — reaction records

## Environment Setup
```bash
# Backend env (flappy_BE/.env)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
PORT=3001
FRONTEND_URL=http://localhost:3000

# Frontend env (flappy_FE/.env)
REACT_APP_API_URL=http://localhost:3001
```

## Common Issues

### "Cannot find module" after adding new schema
→ Make sure the schema is registered in the module's `MongooseModule.forFeature([...])`

### Tests fail with "TypeError: Cannot read properties of undefined"
→ The service mock is missing a method. Check what the service calls and add it to the mock factory.

### Property tests are slow
→ Normal — 100 iterations × async operations. Always use `--runInBand` to avoid worker pool issues.

### Frontend shows stale data after mutation
→ Call `queryClient.invalidateQueries('queryKey')` in the mutation's `onSuccess` handler.

### Wallet shows 0 coins despite having transactions
→ Check if `PostCoinLedger` records exist. If not (legacy data), the fallback aggregates from `CoinTransaction` by post IDs owned by the user.
