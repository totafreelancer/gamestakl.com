import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time messaging + calling signaling.
    URL: ws/chat/<conversation_id>/

    Each user joins TWO groups:
    1. chat_{conversation_id} — for messages/typing within this conversation
    2. user_{user_id} — for cross-conversation signals (calls, notifications)

    WebSocket message types:
      Messaging: send_message, typing_status, mark_as_seen
      Calling:   call_user, call_accept, call_decline, call_end
    """

    async def connect(self):
        self.user = self.scope['user']
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.conversation = await self.get_conversation(self.conversation_id)
        if not self.conversation:
            await self.close()
            return

        is_participant = await self.check_participation(self.conversation_id, self.user.id)
        if not is_participant:
            await self.close()
            return

        # Group 1: conversation-specific (messages, typing)
        self.conversation_group = f'chat_{self.conversation_id}'
        # Group 2: personal user group (call signals, notifications)
        self.user_group = f'user_{self.user.id}'

        await self.channel_layer.group_add(self.conversation_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        for group in ('conversation_group', 'user_group'):
            g = getattr(self, group, None)
            if g:
                await self.channel_layer.group_discard(g, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type', 'send_message')

        handlers = {
            'send_message': self.handle_send_message,
            'typing_status': self.handle_typing_status,
            'mark_as_seen': self.handle_mark_as_seen,
            'call_user': self.handle_call_user,
            'call_accept': self.handle_call_accept,
            'call_decline': self.handle_call_decline,
            'call_end': self.handle_call_end,
        }
        handler = handlers.get(msg_type)
        if handler:
            await handler(data)

    # ==================== MESSAGE HANDLERS ====================

    async def handle_send_message(self, data):
        """
        Handle incoming WebSocket message.

        Supports two flows:
          1. TEXT:    { type: "send_message", text: "..." }
          2. IMAGE:   { type: "send_message", text: "...", image_url: "...", message_type: "IMAGE" }

        For IMAGE messages, the image has already been uploaded via the
        /api/chat/messages/upload-image/ endpoint. The frontend sends the
        returned image_url here, and the consumer links it to the Message record.
        """
        text = data.get('text', '').strip()
        image_url = data.get('image_url', '')
        message_type = data.get('message_type', 'TEXT').upper()

        # Validate: must have text or image
        if not text and not image_url:
            return

        # Determine the message type
        if image_url and message_type == 'IMAGE':
            msg_type = 'IMAGE'
        else:
            msg_type = 'TEXT'

        # Save the message to the database
        message = await self.save_message(
            conversation_id=int(self.conversation_id),
            sender_id=self.user.id,
            text=text,
            image_url=image_url if msg_type == 'IMAGE' else '',
            message_type=msg_type,
        )
        if not message:
            return

        sender_picture = await self.get_profile_picture(self.user.id)

        # Broadcast to all participants in the conversation
        await self.channel_layer.group_send(self.conversation_group, {
            'type': 'chat_message',
            'message_id': message['id'],
            'sender_id': self.user.id,
            'sender_username': self.user.username,
            'sender_profile_picture': sender_picture,
            'text': text,
            'image_url': image_url if msg_type == 'IMAGE' else '',
            'message_type': msg_type,
            'timestamp': message['timestamp'],
            'is_seen': False,
        })

    async def handle_typing_status(self, data):
        await self.channel_layer.group_send(self.conversation_group, {
            'type': 'typing_indicator',
            'user_id': self.user.id,
            'username': self.user.username,
            'is_typing': data.get('is_typing', False),
        })

    async def handle_mark_as_seen(self, data):
        await self.mark_conversation_seen(int(self.conversation_id), self.user.id)
        await self.channel_layer.group_send(self.conversation_group, {
            'type': 'messages_seen',
            'seen_by_user_id': self.user.id,
            'seen_by_username': self.user.username,
        })

    # ==================== CALL SIGNALING HANDLERS ====================

    async def handle_call_user(self, data):
        """
        Caller initiates a call.
        Payload: { type: "call_user", conversation_id, sender_id, call_type }
        Broadcasts to the RECEIVER'S personal user group so they get notified
        regardless of which conversation they're currently viewing.
        """
        receiver_id = data.get('sender_id')  # The other participant in this DM
        call_type = data.get('call_type', 'audio')
        session_id = str(uuid.uuid4())

        # For a DM conversation, the receiver is the other participant
        # If sender_id is provided explicitly, use it; otherwise derive from conversation
        if not receiver_id:
            other = await self.get_other_participant(int(self.conversation_id), self.user.id)
            receiver_id = other.id if other else None

        if not receiver_id:
            return

        # Create call session in DB
        await self.create_call_session(
            conversation_id=int(self.conversation_id),
            caller_id=self.user.id,
            receiver_id=receiver_id,
            call_type=call_type,
            session_id=session_id,
        )

        caller_picture = await self.get_profile_picture(self.user.id)

        # Send to RECEIVER'S personal group — they get notified even if
        # they're viewing a different conversation or page
        receiver_group = f'user_{receiver_id}'
        await self.channel_layer.group_send(receiver_group, {
            'type': 'call_signal',
            'signal_type': 'call_incoming',
            'session_id': session_id,
            'call_type': call_type,
            'caller_id': self.user.id,
            'caller_username': self.user.username,
            'caller_profile_picture': caller_picture,
            'receiver_id': receiver_id,
            'conversation_id': int(self.conversation_id),
        })

    async def handle_call_accept(self, data):
        """Receiver accepts the call."""
        session_id = data.get('session_id')
        await self.update_call_session_status(session_id, 'connected')

        # Notify the CALLER via their personal group
        caller_id = data.get('caller_id')
        if caller_id:
            await self.channel_layer.group_send(f'user_{caller_id}', {
                'type': 'call_signal',
                'signal_type': 'call_accepted',
                'session_id': session_id,
                'accepted_by_id': self.user.id,
                'accepted_by_username': self.user.username,
            })

    async def handle_call_decline(self, data):
        """Receiver declines the call."""
        session_id = data.get('session_id')
        await self.update_call_session_status(session_id, 'declined')

        caller_id = data.get('caller_id')
        if caller_id:
            await self.channel_layer.group_send(f'user_{caller_id}', {
                'type': 'call_signal',
                'signal_type': 'call_declined',
                'session_id': session_id,
                'declined_by_id': self.user.id,
                'declined_by_username': self.user.username,
            })

    async def handle_call_end(self, data):
        """Either party ends the call."""
        session_id = data.get('session_id')
        await self.update_call_session_status(session_id, 'ended')

        # Notify the other party via conversation group
        await self.channel_layer.group_send(self.conversation_group, {
            'type': 'call_signal',
            'signal_type': 'call_ended',
            'session_id': session_id,
            'ended_by_id': self.user.id,
        })

    # ==================== EVENT HANDLERS ====================

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message_id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'sender_profile_picture': event.get('sender_profile_picture', ''),
            'text': event.get('text', ''),
            'image_url': event.get('image_url', ''),
            'message_type': event.get('message_type', 'TEXT'),
            'timestamp': event['timestamp'],
            'is_seen': event.get('is_seen', False),
        }))

    async def typing_indicator(self, event):
        if event['user_id'] == self.user.id:
            return
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing'],
        }))

    async def messages_seen(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_seen',
            'seen_by_user_id': event['seen_by_user_id'],
            'seen_by_username': event['seen_by_username'],
        }))

    async def call_signal(self, event):
        """Forward call signaling events to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'call_signal',
            'signal_type': event['signal_type'],
            'session_id': event.get('session_id', ''),
            'call_type': event.get('call_type', 'audio'),
            'caller_id': event.get('caller_id'),
            'caller_username': event.get('caller_username', ''),
            'caller_profile_picture': event.get('caller_profile_picture', ''),
            'receiver_id': event.get('receiver_id'),
            'conversation_id': event.get('conversation_id'),
            'accepted_by_id': event.get('accepted_by_id'),
            'accepted_by_username': event.get('accepted_by_username', ''),
            'declined_by_id': event.get('declined_by_id'),
            'declined_by_username': event.get('declined_by_username', ''),
            'ended_by_id': event.get('ended_by_id'),
        }))

    # ==================== DATABASE OPERATIONS ====================

    @database_sync_to_async
    def get_conversation(self, conversation_id):
        try:
            from .models import Conversation
            return Conversation.objects.get(id=conversation_id)
        except Exception:
            return None

    @database_sync_to_async
    def check_participation(self, conversation_id, user_id):
        try:
            from .models import Conversation
            return Conversation.objects.filter(id=conversation_id, participants__id=user_id).exists()
        except Exception:
            return False

    @database_sync_to_async
    def get_other_participant(self, conversation_id, user_id):
        """Get the other participant in a DM conversation."""
        try:
            from .models import Conversation
            conv = Conversation.objects.get(id=conversation_id)
            return conv.participants.exclude(id=user_id).first()
        except Exception:
            return None

    @database_sync_to_async
    def get_profile_picture(self, user_id):
        try:
            user = User.objects.get(id=user_id)
            if hasattr(user, 'gamer_profile') and user.gamer_profile.profile_picture:
                return user.gamer_profile.profile_picture.url
        except Exception:
            pass
        return ''

    @database_sync_to_async
    def save_message(self, conversation_id, sender_id, text, image_url='', message_type='TEXT'):
        """
        Save a message to the database.

        For IMAGE messages, the image has already been uploaded via the
        /api/chat/messages/upload-image/ endpoint and the returned image_url
        is passed here. We find the temporary Message record (created during upload)
        and link it to the conversation.
        """
        try:
            from .models import Conversation, Message
            conversation = Conversation.objects.get(id=conversation_id)

            if message_type == 'IMAGE' and image_url:
                # Find the temporary message created by the upload endpoint
                # (it has no conversation yet, same sender, IMAGE type)
                temp_msg = Message.objects.filter(
                    conversation__isnull=True,
                    sender_id=sender_id,
                    message_type='IMAGE',
                ).order_by('-id').first()

                if temp_msg:
                    # Link the uploaded image to this conversation
                    temp_msg.conversation = conversation
                    temp_msg.text = text or ''
                    temp_msg.save()
                    message = temp_msg
                else:
                    # Fallback: create a new message record
                    message = Message.objects.create(
                        conversation=conversation,
                        sender_id=sender_id,
                        text=text or '',
                        message_type='IMAGE',
                    )
            else:
                message = Message.objects.create(
                    conversation=conversation,
                    sender_id=sender_id,
                    text=text or '',
                    message_type=message_type,
                )

            conversation.save()
            return {'id': message.id, 'timestamp': str(message.timestamp)}
        except Exception as e:
            print(f"Error saving message: {e}")
            return None

    @database_sync_to_async
    def mark_conversation_seen(self, conversation_id, reader_id):
        try:
            from .models import Message
            Message.objects.filter(
                conversation_id=conversation_id, is_seen=False
            ).exclude(sender_id=reader_id).update(is_seen=True)
        except Exception as e:
            print(f"Error marking seen: {e}")

    @database_sync_to_async
    def create_call_session(self, conversation_id, caller_id, receiver_id, call_type, session_id):
        try:
            from .models import CallSession
            return CallSession.objects.create(
                conversation_id=conversation_id,
                caller_id=caller_id,
                receiver_id=receiver_id,
                call_type=call_type,
                session_id=session_id,
                status='initiated',
            )
        except Exception as e:
            print(f"Error creating call session: {e}")
            return None

    @database_sync_to_async
    def update_call_session_status(self, session_id, status):
        try:
            from .models import CallSession
            call = CallSession.objects.get(session_id=session_id)
            call.status = status
            if status == 'connected':
                call.connected_at = timezone.now()
            elif status in ('declined', 'ended', 'missed'):
                call.ended_at = timezone.now()
            call.save()
        except Exception as e:
            print(f"Error updating call session: {e}")
