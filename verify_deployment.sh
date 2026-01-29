#!/bin/bash
# Deployment Verification Script
# Tests both frontend and backend after deployment

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "NavFlow Deployment Verification"
echo "========================================="
echo ""

# Prompt for URLs
read -p "Enter your BACKEND URL (e.g., https://navflow-api.onrender.com): " BACKEND_URL
read -p "Enter your FRONTEND URL (e.g., https://your-app.vercel.app): " FRONTEND_URL

# Remove trailing slashes
BACKEND_URL=${BACKEND_URL%/}
FRONTEND_URL=${FRONTEND_URL%/}

echo ""
echo "Testing deployment..."
echo ""

# Test 1: Backend Health Check
echo -n "1. Backend Health Check... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/v1/health/")
if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $HEALTH_RESPONSE)"
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $HEALTH_RESPONSE)"
fi

# Test 2: API Schema
echo -n "2. API Schema Endpoint... "
SCHEMA_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/v1/schema/")
if [ "$SCHEMA_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $SCHEMA_RESPONSE)"
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $SCHEMA_RESPONSE)"
fi

# Test 3: Swagger UI
echo -n "3. Swagger UI... "
SWAGGER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/v1/schema/swagger-ui/")
if [ "$SWAGGER_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $SWAGGER_RESPONSE)"
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $SWAGGER_RESPONSE)"
fi

# Test 4: Auth Endpoints
echo -n "4. Authentication Endpoints... "
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/v1/auth/register/")
if [ "$AUTH_RESPONSE" -eq 405 ] || [ "$AUTH_RESPONSE" -eq 400 ]; then
    # 405 Method Not Allowed or 400 Bad Request means endpoint exists
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $AUTH_RESPONSE - Endpoint exists)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $AUTH_RESPONSE)"
fi

# Test 5: Frontend Accessibility
echo -n "5. Frontend Accessibility... "
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $FRONTEND_RESPONSE)"
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $FRONTEND_RESPONSE)"
fi

# Test 6: CORS Headers (simulate frontend request)
echo -n "6. CORS Configuration... "
CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: POST" -X OPTIONS "${BACKEND_URL}/api/v1/auth/login/" -o /dev/null -w "%{http_code}")
if [ "$CORS_RESPONSE" -eq 200 ] || [ "$CORS_RESPONSE" -eq 204 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $CORS_RESPONSE)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $CORS_RESPONSE) - Check CORS_ALLOWED_ORIGINS"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Next Steps:"
echo "1. Visit: $FRONTEND_URL"
echo "2. Test user registration and login"
echo "3. Check browser console for errors"
echo "4. Visit API docs: ${BACKEND_URL}/api/v1/schema/swagger-ui/"
echo ""
echo "If any tests failed, check DEPLOYMENT_GUIDE.md"
echo "Troubleshooting section for solutions."
echo ""
