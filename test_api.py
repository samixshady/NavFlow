#!/usr/bin/env python
"""
Simple test script to verify the NavFlow API homepage is working.
Run this after starting the development server.
"""

import requests
import json
import sys

def test_homepage():
    """Test the homepage endpoint"""
    try:
        response = requests.get('http://localhost:8000/', timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        print("=" * 60)
        print("✅ NavFlow API Homepage Test - PASSED")
        print("=" * 60)
        print("\nResponse JSON:")
        print(json.dumps(data, indent=2))
        print("\n" + "=" * 60)
        
        # Verify key fields exist
        assert 'message' in data, "Missing 'message' field"
        assert data['message'] == "NavFlow API is running!", "Incorrect message"
        assert 'endpoints' in data, "Missing 'endpoints' field"
        assert 'auth' in data['endpoints'], "Missing 'auth' endpoints"
        
        print("✅ All required fields present")
        print("✅ API is responding correctly")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to http://localhost:8000/")
        print("   Make sure the server is running: python manage.py runserver")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return False
    except json.JSONDecodeError:
        print("❌ ERROR: Response is not valid JSON")
        return False
    except AssertionError as e:
        print(f"❌ ERROR: Validation failed - {e}")
        return False

def test_auth_endpoints():
    """Test that auth endpoints are listed"""
    try:
        response = requests.get('http://localhost:8000/', timeout=5)
        data = response.json()
        
        auth_endpoints = data['endpoints']['auth']
        
        print("\nAuthentication Endpoints:")
        print("-" * 60)
        for name, url in auth_endpoints.items():
            print(f"  {name:20} → {url}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing endpoints: {e}")
        return False

if __name__ == "__main__":
    print("\nTesting NavFlow API...\n")
    
    success = test_homepage()
    if success:
        test_auth_endpoints()
        sys.exit(0)
    else:
        sys.exit(1)
