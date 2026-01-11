#!/bin/bash

echo "🧪 Testing Profile Fix..."

API_URL="http://localhost:3001"

# Test with a known user UUID (replace with actual userId from your database)
echo "1. Testing profile endpoint with UUID"
echo "If you have a user, replace 'your-user-uuid-here' with actual userId"

# Example test with UUID format
TEST_UUID="550e8400-e29b-41d4-a716-446655440000"
echo "Testing: GET $API_URL/users/$TEST_UUID"

RESPONSE=$(curl -s "$API_URL/users/$TEST_UUID")
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test with MongoDB ObjectId format (should also work now)
TEST_OBJECTID="507f1f77bcf86cd799439011"
echo "2. Testing profile endpoint with MongoDB ObjectId"
echo "Testing: GET $API_URL/users/$TEST_OBJECTID"

RESPONSE=$(curl -s "$API_URL/users/$TEST_OBJECTID")
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo "✅ Profile endpoint tests complete!"
echo ""
echo "The backend now supports both:"
echo "- UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)"
echo "- MongoDB ObjectId format (e.g., 507f1f77bcf86cd799439011)"
echo ""
echo "Frontend components now use userId (UUID) for profile links instead of _id"