from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from firebase_app import verify_id_token
from .models import User, GamerProfile
import secrets
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_login(request):
    """
    Verify Firebase ID token (Google sign-in) and return JWT tokens.
    If user doesn't exist, create a new account automatically.
    Expects: {"id_token": "..."}
    Returns: {"access": "...", "refresh": "...", "user": {...}}
    """
    id_token = request.data.get('id_token')
    logger.info(f"firebase_login called. Token present: {bool(id_token)}")
    
    if not id_token:
        logger.warning("No id_token provided in request")
        return Response(
            {'error': 'id_token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify token (handles clock skew automatically with retry)
    try:
        decoded_token = verify_id_token(id_token)
    except Exception as e:
        logger.error(f"Token verification threw exception: {e}")
        return Response(
            {'error': f'Token verification failed: {str(e)}'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not decoded_token:
        logger.warning("Token verification returned None")
        return Response(
            {'error': 'Invalid or expired token. Please try again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    uid = decoded_token.get('uid')
    email = decoded_token.get('email', '')
    name = decoded_token.get('name', '')
    picture = decoded_token.get('picture', '')
    
    logger.info(f"Token decoded. UID: {uid}, Email: {email}")

    # Get or create user in Django database
    # First try to find by firebase_uid, then by email
    user = None
    if uid:
        try:
            user = User.objects.get(firebase_uid=uid)
            logger.info(f"Found existing user by firebase_uid: {user.email}")
        except User.DoesNotExist:
            pass

    if not user and email:
        try:
            user = User.objects.get(email=email)
            # Link firebase_uid if not set
            if not user.firebase_uid and uid:
                user.firebase_uid = uid
                user.save(update_fields=['firebase_uid'])
                logger.info(f"Linked firebase_uid to existing user: {email}")
        except User.DoesNotExist:
            pass

    if not user:
        # Create new user
        logger.info(f"Creating new user for email: {email}, uid: {uid}")
        base_username = email.split('@')[0] if email else f'user_{uid[:8]}'
        username = base_username
        # Ensure unique username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        # Generate a random password (user will use Firebase/Google to login)
        random_password = secrets.token_urlsafe(32)

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password,
                firebase_uid=uid,
            )
            logger.info(f"New user created: {username} ({email})")
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return Response(
                {'error': f'Failed to create account: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Set name from Google profile
        if name:
            parts = name.split(' ', 1)
            user.first_name = parts[0] if len(parts) > 0 else ''
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save(update_fields=['first_name', 'last_name'])

        # Create GamerProfile
        GamerProfile.objects.get_or_create(user=user)

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    # Build user response
    try:
        profile = user.gamer_profile
        profile_data = {
            'points': str(profile.points),
            'vip_status': profile.vip_status,
            'in_game_id': profile.in_game_id,
            'profile_picture': profile.profile_picture.url if profile.profile_picture else None,
        }
    except GamerProfile.DoesNotExist:
        profile_data = {
            'points': '0',
            'vip_status': False,
            'in_game_id': None,
            'profile_picture': None,
        }

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'firebase_uid': user.firebase_uid,
            **profile_data,
        },
        'message': 'Authentication successful'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def firebase_test(request):
    """
    Test Firebase connection.
    """
    from firebase_admin import _apps
    if _apps:
        # Get the default app (stored under '[DEFAULT]' key or first available)
        app = _apps.get('[DEFAULT]') or next(iter(_apps.values()), None)
        return Response({
            'status': 'Firebase is connected',
            'project_id': app.project_id if app else None
        })
    return Response(
        {'status': 'Firebase not initialized'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
