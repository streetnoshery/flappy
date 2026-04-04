#!/bin/bash
# ============================================================
# Flappy - Backend Deploy Script
# Run from the workspace root on your LOCAL machine:
#   bash deploy/deploy-backend.sh
# Or run directly on the EC2 server after cloning the repo.
# ============================================================

set -e

DEPLOY_DIR="/home/ubuntu/flappy_BE"

echo "🔧 Deploying Flappy Backend..."

# ── Copy source files ────────────────────────────────────────
echo "📁 Copying backend source files..."
cp -r flappy_BE/src         "$DEPLOY_DIR/"
cp    flappy_BE/package.json "$DEPLOY_DIR/"
cp    flappy_BE/package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
cp    flappy_BE/tsconfig.json "$DEPLOY_DIR/"
cp    flappy_BE/tsconfig.build.json "$DEPLOY_DIR/"
cp    flappy_BE/nest-cli.json "$DEPLOY_DIR/"

# ── .env (only if it doesn't already exist on server) ────────
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "📝 Copying .env file (first deploy)..."
  cp flappy_BE/.env "$DEPLOY_DIR/.env"
else
  echo "⚠️  .env already exists on server - skipping (edit manually if needed)"
fi

# ── Install dependencies ─────────────────────────────────────
echo "📦 Installing dependencies..."
cd "$DEPLOY_DIR"
npm ci --omit=dev 2>/dev/null || npm install

# ── Build TypeScript ─────────────────────────────────────────
echo "🔨 Building TypeScript..."
npm run build

# ── Start / Restart with PM2 ─────────────────────────────────
echo "🚀 Starting backend with PM2..."
if pm2 describe flappy-backend > /dev/null 2>&1; then
  pm2 restart flappy-backend
  echo "♻️  Backend restarted"
else
  pm2 start dist/main.js --name flappy-backend \
    --max-memory-restart 400M \
    --restart-delay 3000
  echo "✅ Backend started"
fi

pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "✅ Backend deployed!"
echo "   Status: pm2 status"
echo "   Logs:   pm2 logs flappy-backend"
echo "   Test:   curl http://localhost:3001/health"
