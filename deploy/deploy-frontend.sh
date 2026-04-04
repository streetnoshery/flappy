#!/bin/bash
# ============================================================
# Flappy - Frontend Deploy Script
# Run from the workspace root on your LOCAL machine:
#   bash deploy/deploy-frontend.sh
# Or run directly on the EC2 server after cloning the repo.
# ============================================================

set -e

BUILD_DIR="/var/www/flappy/frontend"

echo "🎨 Deploying Flappy Frontend..."

cd flappy_FE

# ── Install dependencies ─────────────────────────────────────
echo "📦 Installing dependencies..."
npm ci 2>/dev/null || npm install

# ── Build React app ──────────────────────────────────────────
echo "🔨 Building React app for production..."
REACT_APP_API_URL=https://flappy.co.in/api npm run build

# ── Deploy build to nginx directory ──────────────────────────
echo "📁 Copying build files to $BUILD_DIR..."
sudo rm -rf "$BUILD_DIR"/*
sudo cp -r build/* "$BUILD_DIR/"
sudo chown -R www-data:www-data "$BUILD_DIR"
sudo chmod -R 755 "$BUILD_DIR"

cd ..

echo ""
echo "✅ Frontend deployed to $BUILD_DIR"
echo "   Test: curl http://localhost"
