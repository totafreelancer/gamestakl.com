"""
JWT Authentication middleware for Django Channels WebSocket connections.
Allows passing the JWT token as a query parameter: ws/chat/<id>/?token=<jwt_token>
"""
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    """Validate JWT token and return the associated user."""
    try:
        access_token = AccessToken(token)
        user_id = access_token['user_id']
        user = User.objects.get(id=user_id)
        if user.is_active:
            return user
    except (TokenError, InvalidToken, User.DoesNotExist):
        pass
    return None


class JWTAuthMiddleware:
    """
    Middleware that authenticates WebSocket connections using JWT tokens.
    Token is expected as a query parameter: ?token=<jwt_token>
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Try to get token from query string
        query_string = scope.get('query_string', b'').decode('utf-8')
        token = None

        if query_string:
            params = {}
            for param in query_string.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    params[key] = value
            token = params.get('token')

        if token:
            user = await get_user_from_token(token)
            if user:
                scope['user'] = user

        return await self.inner(scope, receive, send)
