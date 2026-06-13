import firebase_admin
from firebase_admin import credentials, auth, messaging
import os
import time as _time
import jwt as _jwt
import requests as _requests

# Cache for Firebase public keys
_PUBLIC_KEYS = {}
_PUBLIC_KEYS_FETCHED_AT = 0
_PUBLIC_KEYS_CACHE_TTL = 3600  # 1 hour


def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    if not firebase_admin._apps:
        # Option 1: Load from environment variable (recommended for production)
        firebase_creds_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        if firebase_creds_json:
            import json
            try:
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase initialized successfully from environment variable.")
                return
            except Exception as e:
                print(f"WARNING: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

        # Option 2: Load from file (for local development)
        cred_path = os.path.join(os.path.dirname(__file__), 'firebase-service-account.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully from file.")
        else:
            print("WARNING: Firebase credentials not found. Firebase features will be disabled.")
    else:
        print("Firebase already initialized.")


def _get_firebase_public_keys():
    """Fetch and cache Firebase public keys for token verification."""
    global _PUBLIC_KEYS, _PUBLIC_KEYS_FETCHED_AT

    current_time = _time.time()
    if current_time - _PUBLIC_KEYS_FETCHED_AT < _PUBLIC_KEYS_CACHE_TTL and _PUBLIC_KEYS:
        return _PUBLIC_KEYS

    try:
        url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        response = _requests.get(url, timeout=10)
        response.raise_for_status()
        _PUBLIC_KEYS = response.json()
        _PUBLIC_KEYS_FETCHED_AT = current_time
        return _PUBLIC_KEYS
    except Exception as e:
        print(f"Failed to fetch Firebase public keys: {e}")
        return _PUBLIC_KEYS


def verify_id_token(id_token):
    """Verify a Firebase ID token and return the decoded token.

    Completely bypasses clock skew issues by:
    1. Decoding the token without ANY time-based verification
    2. Manually checking only expiration (with large leeway)
    3. Verifying audience and issuer
    """
    import datetime

    # Get public keys
    public_keys = _get_firebase_public_keys()
    if not public_keys:
        print("No public keys available for verification")
        return None

    # Get key ID from token header
    try:
        unverified_header = _jwt.get_unverified_header(id_token)
        kid = unverified_header.get("kid")
        if not kid or kid not in public_keys:
            print(f"Key ID {kid} not found in public keys")
            return None
    except Exception as e:
        print(f"Failed to decode token header: {e}")
        return None

    # Get the public key
    try:
        from cryptography.x509 import load_pem_x509_certificate
        from cryptography.hazmat.backends import default_backend
        pem_key = public_keys[kid]
        cert = load_pem_x509_certificate(pem_key.encode('utf-8'), default_backend())
        public_key = cert.public_key()
    except Exception as e:
        print(f"Failed to load public key: {e}")
        return None

    # Use project_id from Firebase config (can't use firebase_admin.get_app() 
    # because Admin SDK may not be initialized without service account file)
    project_id = "hubzone-gaming"

    # Decode token with ALL verification disabled - we'll do manual checks
    try:
        decoded = _jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            options={
                "verify_signature": True,
                "verify_exp": False,     # We'll check exp manually with leeway
                "verify_iat": False,     # Skip iat completely (clock skew fix)
                "verify_nbf": False,     # Skip nbf completely
                "verify_aud": False,     # We'll check aud manually
                "verify_iss": False,     # We'll check iss manually
                "require": ["exp", "aud", "iss", "sub"],
            },
        )
    except Exception as e:
        print(f"Token decode failed: {e}")
        return None

    # Manual expiration check with large leeway (10 minutes)
    try:
        exp_timestamp = decoded.get("exp", 0)
        now = datetime.datetime.utcnow().timestamp()
        # Allow 10 minutes of leeway for clock skew
        if exp_timestamp < (now - 600):  # 10 minutes leeway
            print(f"Token expired: exp={exp_timestamp}, now={now}")
            return None
    except Exception as e:
        print(f"Expiration check failed: {e}")
        return None

    # Manual audience check
    if decoded.get("aud") != project_id:
        print(f"Audience mismatch: {decoded.get('aud')} != {project_id}")
        return None

    # Manual issuer check
    expected_issuer = f"https://securetoken.google.com/{project_id}"
    if decoded.get("iss") != expected_issuer:
        print(f"Issuer mismatch: {decoded.get('iss')} != {expected_issuer}")
        return None

    # Manual subject check (must have a subject/sub)
    if not decoded.get("sub"):
        print("Token has no subject (sub) claim")
        return None

    print("Token verified successfully (clock skew tolerant)")
    return decoded


def get_user_by_uid(uid):
    """Get Firebase user by UID."""
    try:
        user = auth.get_user(uid)
        return user
    except Exception as e:
        print(f"Failed to get user: {e}")
        return None


def create_custom_token(uid, additional_claims=None):
    """Create a custom token for a user."""
    try:
        token = auth.create_custom_token(uid, additional_claims)
        return token
    except Exception as e:
        print(f"Failed to create custom token: {e}")
        return None


def send_push_notification(token, title, body, data=None):
    """Send a push notification via Firebase Cloud Messaging."""
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=token,
        )
        response = messaging.send(message)
        print(f"Notification sent: {response}")
        return response
    except Exception as e:
        print(f"Failed to send notification: {e}")
        return None

def send_multicast_notification(tokens, title, body, data=None):
    """Send push notifications to multiple devices."""
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=tokens,
        )
        response = messaging.send_multicast(message)
        print(f"Multicast sent: {response.success_count} successful, {response.failure_count} failed")
        return response
    except Exception as e:
        print(f"Failed to send multicast: {e}")
        return None

def update_firestore_document(collection, document_id, data):
    """Update or create a Firestore document."""
    try:
        db = firestore.client()
        doc_ref = db.collection(collection).document(document_id)
        doc_ref.set(data, merge=True)
        print(f"Document {collection}/{document_id} updated.")
        return True
    except Exception as e:
        print(f"Failed to update Firestore: {e}")
        return False

def delete_firestore_document(collection, document_id):
    """Delete a Firestore document."""
    try:
        db = firestore.client()
        doc_ref = db.collection(collection).document(document_id)
        doc_ref.delete()
        print(f"Document {collection}/{document_id} deleted.")
        return True
    except Exception as e:
        print(f"Failed to delete Firestore document: {e}")
        return False

def get_firestore_document(collection, document_id):
    """Get a Firestore document."""
    try:
        db = firestore.client()
        doc_ref = db.collection(collection).document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        print(f"Failed to get Firestore document: {e}")
        return None

def delete_firebase_user(uid):
    """Delete a user from Firebase Auth by UID."""
    try:
        auth.delete_user(uid)
        print(f"Firebase user {uid} deleted successfully.")
        return True
    except Exception as e:
        print(f"Failed to delete Firebase user {uid}: {e}")
        return False

# Initialize on import (gracefully handles missing credentials)
initialize_firebase()
