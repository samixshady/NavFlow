import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'navflow.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection

# Test database connection
print("=" * 60)
print("DATABASE CONNECTION TEST")
print("=" * 60)

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("✓ Database connection: SUCCESS")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    exit(1)

# Check users
User = get_user_model()
try:
    user_count = User.objects.count()
    print(f"✓ Users in database: {user_count}")
    
    admin_count = User.objects.filter(is_staff=True).count()
    print(f"✓ Admin users: {admin_count}")
    
    if user_count > 0:
        print("\n Users:")
        for user in User.objects.all()[:10]:
            print(f"  - {user.username} (active={user.is_active}, admin={user.is_staff}, superuser={user.is_superuser})")
    else:
        print("⚠ No users found in database!")
        print("Create a superuser with: python manage.py createsuperuser")
        
except Exception as e:
    print(f"✗ Error checking users: {e}")
    exit(1)

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
