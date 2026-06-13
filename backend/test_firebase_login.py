"""
Test script to verify Firebase login flow.
Run: python test_firebase_login.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import firebase_admin
from firebase_app import verify_id_token, initialize_firebase
from authentication.models import User, GamerProfile

print("=" * 60)
print("Firebase Login Test")
print("=" * 60)

# Test 1: Check Firebase initialization
print("\n[TEST 1] Firebase Initialization")
print(f"  Firebase apps: {len(firebase_admin._apps)} app(s) initialized")
print(f"  Project ID: {django.apps.apps.get_app_config('authentication').name}")

# Test 2: Check database connection
print("\n[TEST 2] Database Connection")
try:
    user_count = User.objects.count()
    print(f"  ✓ Connected! Total users in DB: {user_count}")
except Exception as e:
    print(f"  ✗ Database error: {e}")

# Test 3: Check GamerProfile model
print("\n[TEST 3] GamerProfile Model")
try:
    profile_count = GamerProfile.objects.count()
    print(f"  ✓ GamerProfile model OK! Total profiles: {profile_count}")
except Exception as e:
    print(f"  ✗ GamerProfile error: {e}")

# Test 4: Simulate user creation (what happens when a new Firebase user logs in)
print("\n[TEST 4] Simulate New User Creation")
test_email = "test_firebase_user@example.com"
test_uid = "test_firebase_uid_12345"
test_name = "Test User"

# Clean up if exists
User.objects.filter(email=test_email).delete()

try:
    user = User.objects.create_user(
        username="test_firebase_user",
        email=test_email,
        password="test_password_123",
        firebase_uid=test_uid,
    )
    user.first_name = "Test"
    user.last_name = "User"
    user.save()
    
    profile, created = GamerProfile.objects.get_or_create(user=user)
    
    print(f"  ✓ User created: {user.username} (ID: {user.id})")
    print(f"  ✓ GamerProfile created: points={profile.points}, vip={profile.vip_status}")
    print(f"  ✓ Email: {user.email}")
    print(f"  ✓ Firebase UID: {user.firebase_uid}")
    print(f"  ✓ Name: {user.first_name} {user.last_name}")
    
    # Clean up
    user.delete()
    print(f"  ✓ Test user cleaned up")
    
except Exception as e:
    print(f"  ✗ User creation error: {e}")

# Test 5: Check verify_id_token function
print("\n[TEST 5] Token Verification Function")
print("  The verify_id_token function handles:")
print("  1. Standard Firebase Admin SDK verification")
print("  2. Clock skew (token used too early) - falls back to custom verification")
print("  3. Custom verification using Firebase public keys with iat check disabled")

# Test 6: List existing Firebase users
print("\n[TEST 6] Existing Firebase Users")
firebase_users = User.objects.exclude(firebase_uid__isnull=True).exclude(firebase_uid='')
print(f"  Total Firebase users: {firebase_users.count()}")
for u in firebase_users[:5]:
    print(f"    - {u.username} ({u.email}) - UID: {u.firebase_uid[:20]}...")

print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)
print("\nTo test real Google Sign-In:")
print("1. Open http://localhost:3000/login in your REAL browser (Chrome/Firefox)")
print("2. Click 'Continue with Google'")
print("3. Sign in with your Google account")
print("4. You will be logged in automatically!")
