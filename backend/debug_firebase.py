"""
Firebase Login Debug Script
============================
Run this script to diagnose Firebase authentication issues.

Usage: python debug_firebase.py
"""
import os
import sys
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_app import verify_id_token, _get_firebase_public_keys
from authentication.models import User, GamerProfile

print("=" * 70)
print("FIREBASE LOGIN DEBUG CHECKLIST")
print("=" * 70)

# ✅ CHECK 1: Firebase Admin SDK Initialization
print("\n[CHECK 1] Firebase Admin SDK Initialization")
if firebase_admin._apps:
    app = firebase_admin.get_app()
    print(f"  ✅ Firebase initialized")
    print(f"  📋 Project ID: {app.project_id}")
    print(f"  📋 App name: {app.name}")
else:
    print("  ❌ Firebase NOT initialized!")

# ✅ CHECK 2: System Clock
print("\n[CHECK 2] System Clock Check")
server_time = int(time.time())
print(f"  📋 Server unix time: {server_time}")
print(f"  📋 Server time (human): {time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"  ⚠️  If your clock is off by more than 5 minutes, token verification will fail!")

# ✅ CHECK 3: Firebase Public Keys
print("\n[CHECK 3] Firebase Public Keys")
keys = _get_firebase_public_keys()
if keys:
    print(f"  ✅ Public keys fetched: {len(keys)} key(s)")
    for kid in list(keys.keys())[:2]:
        print(f"     - Key ID: {kid[:20]}...")
else:
    print("  ❌ No public keys available!")

# ✅ CHECK 4: Database Connection
print("\n[CHECK 4] Database Connection")
try:
    user_count = User.objects.count()
    profile_count = GamerProfile.objects.count()
    print(f"  ✅ Database connected")
    print(f"  📋 Total users: {user_count}")
    print(f"  📋 Total profiles: {profile_count}")
except Exception as e:
    print(f"  ❌ Database error: {e}")

# ✅ CHECK 5: CORS Settings
print("\n[CHECK 5] CORS Settings")
from django.conf import settings
cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
print(f"  📋 Allowed origins: {cors_origins}")
if 'http://localhost:3000' in cors_origins:
    print("  ✅ localhost:3000 is allowed")
else:
    print("  ❌ localhost:3000 is NOT allowed!")

# ✅ CHECK 6: Firebase Service Account
print("\n[CHECK 6] Firebase Service Account")
cred_path = os.path.join(os.path.dirname(__file__), 'firebase-service-account.json')
if os.path.exists(cred_path):
    print(f"  ✅ Service account file exists: {cred_path}")
    import json
    with open(cred_path) as f:
        cred_data = json.load(f)
    print(f"  📋 Project ID (from file): {cred_data.get('project_id', 'N/A')}")
    print(f"  📋 Client email: {cred_data.get('client_email', 'N/A')}")
    
    # Check if project IDs match
    if firebase_admin._apps:
        app_project_id = firebase_admin.get_app().project_id
        file_project_id = cred_data.get('project_id', '')
        if app_project_id == file_project_id:
            print(f"  ✅ Project IDs match: {app_project_id}")
        else:
            print(f"  ❌ Project ID mismatch!")
            print(f"     App: {app_project_id}")
            print(f"     File: {file_project_id}")
else:
    print(f"  ❌ Service account file NOT found: {cred_path}")

# ✅ CHECK 7: Test Token Verification
print("\n[CHECK 7] Token Verification Test")
test_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImlhdCI6MTc4MTE3NzUyMywiZXhwIjo5OTk5OTk5OTk5LCJhdWQiOiJodWJ6b25lLWdhbWluZyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9odWJ6b25lLWdhbWluZyJ9.test"
result = verify_id_token(test_token)
if result is None:
    print("  ✅ Invalid token correctly rejected (returns None)")
else:
    print("  ⚠️  Token verification returned a result (unexpected)")

# ✅ CHECK 8: Existing Firebase Users
print("\n[CHECK 8] Existing Firebase Users")
firebase_users = User.objects.exclude(firebase_uid__isnull=True).exclude(firebase_uid='')
print(f"  📋 Total Firebase users: {firebase_users.count()}")
for u in firebase_users[:5]:
    print(f"     - {u.username} ({u.email})")
    print(f"       UID: {u.firebase_uid[:30]}...")
    print(f"       Name: {u.first_name} {u.last_name}")
    try:
        profile = u.gamer_profile
        print(f"       Profile: points={profile.points}, vip={profile.vip_status}")
    except GamerProfile.DoesNotExist:
        print(f"       Profile: ❌ No GamerProfile!")

# ✅ CHECK 9: Simulate New User Creation
print("\n[CHECK 9] Simulate New User Creation")
test_email = "debug_test_user@example.com"
test_uid = f"debug_uid_{int(time.time())}"
User.objects.filter(email=test_email).delete()
try:
    user = User.objects.create_user(
        username=f"debug_user_{int(time.time())}",
        email=test_email,
        password="debug_password",
        firebase_uid=test_uid,
    )
    user.first_name = "Debug"
    user.last_name = "Test"
    user.save()
    GamerProfile.objects.get_or_create(user=user)
    print(f"  ✅ User created successfully: {user.username}")
    print(f"  ✅ GamerProfile created: points=0, vip=False")
    user.delete()
    print(f"  ✅ Test user cleaned up")
except Exception as e:
    print(f"  ❌ User creation failed: {e}")

print("\n" + "=" * 70)
print("DEBUG CHECKLIST COMPLETE")
print("=" * 70)
print("""
SUMMARY:
--------
If all checks pass (✅), your Firebase setup is correct.

COMMON ISSUES & FIXES:
----------------------
1. ❌ "Token used too early" → Your system clock is wrong
   Fix: Sync your clock with internet time

2. ❌ "Invalid token" → Token format is wrong or expired
   Fix: Make sure you're sending the ID token, not access token

3. ❌ "Project ID mismatch" → Firebase config doesn't match
   Fix: Check firebase-service-account.json project_id

4. ❌ CORS errors → Frontend can't reach backend
   Fix: Add frontend URL to CORS_ALLOWED_ORIGINS

5. ❌ "Token verification failed" → Service account is invalid
   Fix: Download new service account key from Firebase Console

NEXT STEPS:
-----------
1. Open http://localhost:3000/login in your REAL browser (Chrome/Firefox)
2. Click "Continue with Google"
3. Sign in with your Google account
4. Check the terminal for any errors
5. If you see errors, run this debug script again
""")
