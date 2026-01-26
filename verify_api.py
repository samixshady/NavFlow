#!/usr/bin/env python
"""
Quick verification that Projects API is working
"""
import requests
import json

API_BASE = 'http://localhost:8000/api/v1'

def test_projects_api():
    """Quick test of projects endpoints"""
    
    print("\n" + "="*70)
    print("NavFlow Projects API - Quick Verification Test")
    print("="*70)
    
    # Step 1: Login
    print("\n1️⃣  Testing authentication...")
    login_resp = requests.post(f'{API_BASE}/auth/login/', json={
        'email': 'projectowner@example.com',
        'password': 'TestPass123!'
    }, timeout=5)
    
    if login_resp.status_code != 200:
        print(f"   ❌ Login failed: {login_resp.status_code}")
        return False
    
    token = login_resp.json()['access']
    print(f"   ✅ Authenticated as projectowner@example.com")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Step 2: Test Projects endpoint
    print("\n2️⃣  Testing /api/v1/projects/...")
    projects_resp = requests.get(f'{API_BASE}/projects/', headers=headers, timeout=5)
    
    if projects_resp.status_code != 200:
        print(f"   ❌ Failed: {projects_resp.status_code}")
        return False
    
    projects = projects_resp.json()
    print(f"   ✅ Endpoint working - {len(projects)} projects found")
    
    # Step 3: Test Organizations endpoint
    print("\n3️⃣  Testing /api/v1/orgs/...")
    orgs_resp = requests.get(f'{API_BASE}/orgs/', headers=headers, timeout=5)
    
    if orgs_resp.status_code != 200:
        print(f"   ❌ Failed: {orgs_resp.status_code}")
        return False
    
    orgs = orgs_resp.json()
    print(f"   ✅ Endpoint working - {len(orgs)} organizations found")
    
    # Step 4: Test Tasks endpoint
    print("\n4️⃣  Testing /api/v1/tasks/...")
    tasks_resp = requests.get(f'{API_BASE}/tasks/', headers=headers, timeout=5)
    
    if tasks_resp.status_code != 200:
        print(f"   ❌ Failed: {tasks_resp.status_code}")
        return False
    
    tasks = tasks_resp.json()
    print(f"   ✅ Endpoint working - {len(tasks)} tasks found")
    
    # Step 5: Test user endpoint
    print("\n5️⃣  Testing /api/v1/auth/user/...")
    user_resp = requests.get(f'{API_BASE}/auth/user/', headers=headers, timeout=5)
    
    if user_resp.status_code != 200:
        print(f"   ❌ Failed: {user_resp.status_code}")
        return False
    
    user_data = user_resp.json()
    print(f"   ✅ User endpoint working - Logged in as {user_data['email']}")
    
    print("\n" + "="*70)
    print("✅ ALL TESTS PASSED - API is working correctly!")
    print("="*70)
    print("\nEndpoints verified:")
    print("  ✅ /api/v1/auth/login/")
    print("  ✅ /api/v1/auth/user/")
    print("  ✅ /api/v1/projects/")
    print("  ✅ /api/v1/orgs/")
    print("  ✅ /api/v1/tasks/")
    print("\nReady to test the frontend!")
    return True

if __name__ == '__main__':
    try:
        test_projects_api()
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to http://localhost:8000/")
        print("   Make sure Django server is running: python manage.py runserver")
    except Exception as e:
        print(f"❌ ERROR: {e}")
