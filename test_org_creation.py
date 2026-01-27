"""
Test script to verify organization creation works correctly.
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'navflow.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from orgs.models import Organization, Membership

User = get_user_model()

def test_organization_creation():
    print("=" * 60)
    print("Testing Organization Creation")
    print("=" * 60)
    
    # Get or create a test user
    test_email = 'test@example.com'
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={'username': test_email, 'first_name': 'Test', 'last_name': 'User'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ Created new test user: {test_email}")
    else:
        print(f"✅ Using existing test user: {test_email}")
    
    # Get initial counts
    initial_org_count = Organization.objects.count()
    initial_membership_count = Membership.objects.count()
    print(f"\n📊 Initial counts:")
    print(f"   Organizations: {initial_org_count}")
    print(f"   Memberships: {initial_membership_count}")
    
    # Create API client and authenticate
    client = APIClient()
    token = str(AccessToken.for_user(user))
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Test organization creation
    org_data = {
        'name': 'Test Organization',
        'description': 'This is a test organization created by script'
    }
    
    print(f"\n🚀 Creating organization via API...")
    print(f"   Data: {org_data}")
    
    response = client.post('/api/v1/orgs/', org_data, format='json')
    
    print(f"\n📥 API Response:")
    print(f"   Status Code: {response.status_code}")
    print(f"   Response Data: {response.data}")
    
    # Check if organization was created
    final_org_count = Organization.objects.count()
    final_membership_count = Membership.objects.count()
    
    print(f"\n📊 Final counts:")
    print(f"   Organizations: {final_org_count} (change: +{final_org_count - initial_org_count})")
    print(f"   Memberships: {final_membership_count} (change: +{final_membership_count - initial_membership_count})")
    
    if response.status_code == 201:
        print("\n✅ SUCCESS! Organization created successfully!")
        org_id = response.data.get('id')
        
        # Verify the organization exists
        try:
            org = Organization.objects.get(id=org_id)
            print(f"   - Organization '{org.name}' found in database (ID: {org.id})")
            
            # Check membership
            try:
                membership = Membership.objects.get(user=user, organization=org)
                print(f"   - Membership created with role: {membership.role}")
            except Membership.DoesNotExist:
                print("   ⚠️ WARNING: Membership not found!")
        except Organization.DoesNotExist:
            print(f"   ⚠️ WARNING: Organization with ID {org_id} not found in database!")
    else:
        print(f"\n❌ FAILED! Status code: {response.status_code}")
        print(f"   Error: {response.data}")
    
    # List user's organizations
    print(f"\n📋 User's organizations:")
    user_orgs = Organization.objects.filter(memberships__user=user)
    for org in user_orgs:
        membership = Membership.objects.get(user=user, organization=org)
        print(f"   - {org.name} (Role: {membership.role})")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    test_organization_creation()
