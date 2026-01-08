#!/bin/bash

# Flappy Social Media Deployment Script

echo "🚀 Starting Flappy deployment..."

# Backend deployment
echo "📦 Building and starting backend..."
cd flappy_BE
npm install
npm run build
pm2 stop flappy-backend || true
pm2 start dist/main.js --name flappy-backend
pm2 save
cd ..

# Frontend deployment
echo "🎨 Building and deploying frontend..."
cd flappy_FE
npm install
npm run build
sudo cp -r build/* /var/www/html/
cd ..

# Restart nginx
echo "🔄 Restarting nginx..."
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://flappy.co.in"
echo "🔧 Backend: https://flappy.co.in/api"
echo "📊 Check backend status: pm2 status"
echo "📋 Check nginx status: sudo systemctl status nginx"