#!/usr/bin/env python
"""
Setup test users for API testing
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'navflow.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Create test users
users_data = [
    ('projectowner@example.com', 'TestPass123!'),
    ('projectadmin@example.com', 'TestPass123!'),
    ('projectmember@example.com', 'TestPass123!'),
]

for email, password in users_data:
    user, created = User.objects.get_or_create(email=email)
    if created:
        user.set_password(password)
        user.first_name = email.split('@')[0]
        user.last_name = 'Test'
        user.save()
        print(f"✅ Created user: {email}")
    else:
        # Reset password
        user.set_password(password)
        user.save()
        print(f"✅ User already exists (password reset): {email}")

print("\nTest users ready!")
print("Users can now login with their emails and 'TestPass123!' password")
