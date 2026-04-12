#!/bin/bash
# ============================================================
# Flappy - Nginx Configuration Setup
# Run on the EC2 server
# Usage: bash deploy/setup-nginx.sh
# ============================================================

set -e

DOMAIN="flappy.co.in"
BUILD_DIR="/var/www/flappy/frontend"

echo "🌐 Configuring Nginx for $DOMAIN..."

# ── Write nginx config ───────────────────────────────────────
sudo tee /etc/nginx/sites-available/flappy > /dev/null <<EOF
# Redirect www to non-www
server {
    listen 80;
    server_name www.$DOMAIN;
    return 301 http://$DOMAIN\$request_uri;
}

server {
    listen 80;
    server_name $DOMAIN;

    # Frontend - serve React build
    root $BUILD_DIR;
    index index.html;

    # React Router - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }

    # Backend API proxy - strip /api prefix
    location /api/ {
        rewrite ^/api/(.*) /\$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
EOF

# ── Enable site ──────────────────────────────────────────────
sudo ln -sf /etc/nginx/sites-available/flappy /etc/nginx/sites-enabled/flappy
sudo rm -f /etc/nginx/sites-enabled/default

# ── Test and reload ──────────────────────────────────────────
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "✅ Nginx configured!"
echo "   Test: curl http://$DOMAIN"
echo ""
echo "Next: Run bash deploy/setup-ssl.sh to enable HTTPS"
