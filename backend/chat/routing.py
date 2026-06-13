from django.urls import re_path
from . import consumers
from . import notifications

websocket_urlpatterns = [
    # Conversation WebSocket (DM + Group): ws/chat/<conversation_id>/
    re_path(r'ws/chat/(?P<conversation_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
    # Notification WebSocket (existing)
    re_path(r'ws/notifications/$', notifications.NotificationConsumer.as_asgi()),
    # Online status WebSocket (existing)
    re_path(r'ws/online-status/$', notifications.OnlineStatusConsumer.as_asgi()),
]
