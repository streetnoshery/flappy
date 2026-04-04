#!/bin/bash
# ============================================================
# Flappy - AWS EC2 Server Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance
# Usage: bash setup-server.sh
# ============================================================

set -e

echo "🚀 Starting Flappy server setup..."

# ── 1. System Updates ────────────────────────────────────────
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git unzip software-properties-common ufw

# ── 2. Node.js 20 ────────────────────────────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# ── 3. PM2 ───────────────────────────────────────────────────
echo "📦 Installing PM2..."
sudo npm install -g pm2
pm2 --version

# ── 4. Nginx ─────────────────────────────────────────────────
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# ── 5. Certbot (SSL) ─────────────────────────────────────────
echo "📦 Installing Certbot for SSL..."
sudo apt-get install -y certbot python3-certbot-nginx

# ── 6. Firewall ──────────────────────────────────────────────
echo "🔒 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

# ── 7. App directory ─────────────────────────────────────────
echo "📁 Creating app directories..."
sudo mkdir -p /var/www/flappy/frontend
sudo mkdir -p /home/ubuntu/flappy_BE
sudo chown -R ubuntu:ubuntu /var/www/flappy
sudo chown -R ubuntu:ubuntu /home/ubuntu/flappy_BE

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: bash deploy/deploy-backend.sh"
echo "  2. Run: bash deploy/deploy-frontend.sh"
echo "  3. Run: bash deploy/setup-nginx.sh"
echo "  4. Run: bash deploy/setup-ssl.sh  (after DNS is pointing to this server)"
