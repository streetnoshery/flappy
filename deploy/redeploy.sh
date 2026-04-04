#!/bin/bash
# ============================================================
# Flappy - Quick Redeploy Script
# Run on EC2 server to pull latest code and redeploy
# Usage: bash deploy/redeploy.sh
# ============================================================

set -e

REPO_DIR="/home/ubuntu/flappy"   # where you cloned the repo

echo "🔄 Redeploying Flappy..."

cd "$REPO_DIR"

# ── Pull latest code ─────────────────────────────────────────
echo "📥 Pulling latest code..."
git pull origin main

# ── Redeploy backend ─────────────────────────────────────────
echo ""
echo "🔧 Redeploying backend..."
cd "$REPO_DIR/flappy_BE"
npm ci --omit=dev 2>/dev/null || npm install
npm run build
pm2 restart flappy-backend
echo "✅ Backend redeployed"

# ── Redeploy frontend ────────────────────────────────────────
echo ""
echo "🎨 Redeploying frontend..."
cd "$REPO_DIR/flappy_FE"
npm ci 2>/dev/null || npm install
REACT_APP_API_URL=https://flappy.co.in/api npm run build
sudo rm -rf /var/www/flappy/frontend/*
sudo cp -r build/* /var/www/flappy/frontend/
sudo chown -R www-data:www-data /var/www/flappy/frontend
echo "✅ Frontend redeployed"

echo ""
echo "🎉 Redeploy complete!"
echo "   Backend: pm2 logs flappy-backend"
echo "   Site:    https://flappy.co.in"
