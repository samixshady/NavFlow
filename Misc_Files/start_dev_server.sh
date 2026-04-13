#!/usr/bin/env bash
# Phase 4 & 5 Quick Start Guide

echo "=============================================="
echo "NavFlow - Phase 4 & 5 Implementation Guide"
echo "=============================================="
echo ""

# Step 1: Install dependencies
echo "1️⃣  Installing dependencies..."
pip install -r requirements.txt

# Step 2: Create migrations
echo ""
echo "2️⃣  Running migrations..."
python manage.py migrate

# Step 3: Create test users
echo ""
echo "3️⃣  Creating test users..."
python setup_test_users.py

# Step 4: Verify installation
echo ""
echo "4️⃣  Verifying Phase 4 & 5 integration..."
python verify_phase_4_5.py

# Step 5: Start server
echo ""
echo "5️⃣  Starting development server..."
echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Server starting on: http://localhost:8000"
echo ""
echo "📚 API Documentation:"
echo "   - Swagger UI: http://localhost:8000/api/docs/"
echo "   - ReDoc: http://localhost:8000/api/redoc/"
echo "   - OpenAPI Schema: http://localhost:8000/api/schema/"
echo ""
echo "🔐 Test Users:"
echo "   - projectowner@example.com / TestPass123!"
echo "   - projectadmin@example.com / TestPass123!"
echo "   - projectmember@example.com / TestPass123!"
echo ""
echo "📖 Documentation:"
echo "   - README.md - Complete system documentation"
echo "   - PHASE_4_5_SUMMARY.md - Feature summary"
echo "   - SYSTEM_ARCHITECTURE.md - Architecture diagrams"
echo ""
echo "Starting server..."
python manage.py runserver
