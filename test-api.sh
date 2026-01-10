#!/bin/bash

echo "🧪 Testing Flappy API endpoints..."

# Test 1: Direct backend (should work if backend is running)
echo "1. Testing direct backend on localhost:3001"
curl -s http://localhost:3001/health | head -3
echo ""

# Test 2: Through nginx proxy (this is what frontend uses)
echo "2. Testing through nginx proxy: https://flappy.co.in/api/health"
curl -s https://flappy.co.in/api/health | head -3
echo ""

# Test 3: Feature flags endpoint
echo "3. Testing feature flags: https://flappy.co.in/api/feature-flags"
curl -s https://flappy.co.in/api/feature-flags | head -3
echo ""

# Test 4: Check if nginx is proxying correctly
echo "4. Testing nginx proxy headers:"
curl -I https://flappy.co.in/api/health 2>/dev/null | grep -E "(HTTP|Server|Access-Control)"
echo ""

echo "✅ API tests complete!"
echo ""
echo "Expected results:"
echo "- Test 1: Should return backend health info"
echo "- Test 2: Should return same health info through nginx"
echo "- Test 3: Should return feature flags JSON"
echo "- Test 4: Should show CORS headers"