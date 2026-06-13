"""
WebSocket consumer for personal message notifications and online status.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

# In-memory store for online users
# Structure: {user_id: set of channel_names}
online_user_channels = {}

# Reverse mapping: channel_name -> user_id
channel_user_map = {}


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for:
    1. Personal message notifications
    2. Online/offline status tracking
    """

    async def connect(self):
        self.user = self.scope['user']

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.personal_group = f'notifications_{self.user.id}'

        # Join personal notification group
        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )

        await self.accept()

        user_id = self.user.id

        # Track this connection
        if user_id not in online_user_channels:
            online_user_channels[user_id] = set()
        online_user_channels[user_id].add(self.channel_name)
        channel_user_map[self.channel_name] = user_id

        # Only broadcast online if this is the FIRST connection for this user
        if len(online_user_channels[user_id]) == 1:
            await self.channel_layer.group_send(
                'online_status',
                {
                    'type': 'user_online',
                    'user_id': user_id,
                    'username': self.user.username,
                }
            )

        # Send current online users list to the newly connected user
        online_list = []
        for uid, channels in online_user_channels.items():
            if channels:
                try:
                    username = await self.get_username(uid)
                    online_list.append({'user_id': uid, 'username': username})
                except Exception:
                    pass

        await self.send(text_data=json.dumps({
            'type': 'online_users',
            'users': online_list,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(
                self.personal_group,
                self.channel_name
            )

        # Remove this specific connection
        user_id = channel_user_map.pop(self.channel_name, None)
        if user_id and user_id in online_user_channels:
            online_user_channels[user_id].discard(self.channel_name)

            # Only broadcast offline if this was the LAST connection for this user
            if not online_user_channels[user_id]:
                del online_user_channels[user_id]
                await self.channel_layer.group_send(
                    'online_status',
                    {
                        'type': 'user_offline',
                        'user_id': user_id,
                        'username': self.user.username if self.user.is_authenticated else 'Unknown',
                    }
                )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            if msg_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

            elif msg_type == 'mark_read':
                sender_id = data.get('sender_id')
                if sender_id:
                    await self.mark_messages_read(sender_id)
                    await self.send(text_data=json.dumps({
                        'type': 'messages_read',
                        'sender_id': sender_id,
                    }))

        except json.JSONDecodeError:
            pass

    # ---- Handler methods for group messages ----

    async def new_message_notification(self, event):
        """Send new message notification to the receiver."""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'sender_profile_picture': event.get('sender_profile_picture', ''),
            'content': event['content'],
            'message_id': event['message_id'],
            'timestamp': event['timestamp'],
        }))

    async def user_online(self, event):
        """Notify that a user came online."""
        await self.send(text_data=json.dumps({
            'type': 'user_online',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def user_offline(self, event):
        """Notify that a user went offline."""
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    @database_sync_to_async
    def get_username(self, user_id):
        """Get username by user ID."""
        try:
            user = User.objects.get(id=user_id)
            return user.username
        except User.DoesNotExist:
            return 'Unknown'

    @database_sync_to_async
    def mark_messages_read(self, sender_id):
        """Mark all messages from a sender as read."""
        from authentication.models import PersonalMessage
        PersonalMessage.objects.filter(
            sender_id=sender_id,
            receiver=self.user,
            is_read=False
        ).update(is_read=True)


class OnlineStatusConsumer(AsyncWebsocketConsumer):
    """
    Lightweight consumer for tracking online status (no auth required for viewing).
    """

    async def connect(self):
        await self.channel_layer.group_add(
            'online_status',
            self.channel_name
        )
        await self.accept()

        # Send current online users
        online_list = []
        for uid, channels in online_user_channels.items():
            if channels:
                try:
                    username = await self.get_username(uid)
                    online_list.append({'user_id': uid, 'username': username})
                except Exception:
                    pass

        await self.send(text_data=json.dumps({
            'type': 'online_users',
            'users': online_list,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            'online_status',
            self.channel_name
        )

    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_online',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    @database_sync_to_async
    def get_username(self, user_id):
        try:
            user = User.objects.get(id=user_id)
            return user.username
        except User.DoesNotExist:
            return 'Unknown'
