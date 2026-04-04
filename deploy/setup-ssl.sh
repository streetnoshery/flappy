#!/bin/bash
# ============================================================
# Flappy - SSL Certificate Setup (Let's Encrypt / Certbot)
# Run AFTER DNS is pointing to this EC2 server
# Usage: bash deploy/setup-ssl.sh
# ============================================================

set -e

DOMAIN="flappy.co.in"
EMAIL="sumitgod510@gmail.com"   # Change to your email

echo "🔒 Setting up SSL for $DOMAIN..."
echo "⚠️  Make sure your domain DNS A record points to this server's IP first!"
echo ""

# ── Obtain certificate ───────────────────────────────────────
sudo certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

# ── Auto-renewal cron ────────────────────────────────────────
echo "⏰ Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "✅ SSL configured! Site is now available at https://$DOMAIN"
echo "   Certificate auto-renews every 90 days"
