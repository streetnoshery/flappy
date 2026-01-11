#!/bin/bash

echo "🧪 Testing Forgot Password Functionality..."

# Test data
USERNAME="testuser"
API_URL="http://localhost:3001"

echo "1. Testing forgot password endpoint"
echo "Request: POST $API_URL/auth/forgot-password"

FORGOT_RESPONSE=$(curl -s -X POST "$API_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\"}")

echo "Response:"
echo "$FORGOT_RESPONSE" | jq '.' 2>/dev/null || echo "$FORGOT_RESPONSE"
echo ""

# Extract reset token from response (if successful)
RESET_TOKEN=$(echo "$FORGOT_RESPONSE" | jq -r '.resetToken' 2>/dev/null)

if [ "$RESET_TOKEN" != "null" ] && [ "$RESET_TOKEN" != "" ]; then
    echo "2. Testing reset password endpoint"
    echo "Request: POST $API_URL/auth/reset-password"
    
    RESET_RESPONSE=$(curl -s -X POST "$API_URL/auth/reset-password" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\": \"$USERNAME\",
        \"resetToken\": \"$RESET_TOKEN\",
        \"newPassword\": \"NewTestPass123!\"
      }")
    
    echo "Response:"
    echo "$RESET_RESPONSE" | jq '.' 2>/dev/null || echo "$RESET_RESPONSE"
    echo ""
else
    echo "❌ Could not extract reset token from forgot password response"
    echo "This might be because the user doesn't exist or there was an error"
fi

echo "✅ Forgot password API tests complete!"
echo ""
echo "To test with a real user:"
echo "1. First create a user via signup"
echo "2. Then run: curl -X POST $API_URL/auth/forgot-password -H 'Content-Type: application/json' -d '{\"username\": \"your-username\"}'"
echo "3. Use the returned token to reset password"