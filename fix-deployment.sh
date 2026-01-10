#!/bin/bash

echo "🔧 Fixing Flappy deployment API URL issue..."

# Step 1: Verify environment files
echo "📋 Current environment configuration:"
echo "Frontend .env:"
cat flappy_FE/.env
echo ""
echo "Frontend .env.production:"
cat flappy_FE/.env.production
echo ""

# Step 2: Rebuild frontend with correct environment
echo "🎨 Rebuilding frontend with correct API URL..."
cd flappy_FE

# Clear any cached builds
rm -rf build/
rm -rf node_modules/.cache/

# Install dependencies and build
npm install
npm run build

# Step 3: Deploy the new build
echo "🚀 Deploying new build..."
sudo cp -r build/* /var/www/html/

# Step 4: Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx

# Step 5: Test the API endpoint
echo "🧪 Testing API endpoint..."
echo "Testing: https://flappy.co.in/api/feature-flags"
curl -s https://flappy.co.in/api/feature-flags | head -5

echo ""
echo "✅ Fix deployment complete!"
echo "🌐 Frontend: https://flappy.co.in"
echo "🔧 API Test: https://flappy.co.in/api/feature-flags"
echo ""
echo "If still having issues, check:"
echo "1. Nginx configuration is correct"
echo "2. Backend is running on port 3001"
echo "3. Clear browser cache and try again"