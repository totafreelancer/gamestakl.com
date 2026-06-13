from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Max, Count
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from utils.image_compression import compress_image_in_memory

User = get_user_model()


# ==================== CONVERSATION ENDPOINTS ====================

class ConversationListView(generics.ListAPIView):
    """
    List all conversations (DMs + groups) for the current user.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(
            participants=user
        ).distinct().annotate(
            msg_count=Count('messages')
        )


class ConversationDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific conversation.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(participants=user)


# ==================== GROUP CHAT ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_group(request):
    """
    Create a new group conversation.
    Body: { name: string, participant_ids: number[] }
    """
    name = request.data.get('name', '').strip()
    participant_ids = request.data.get('participant_ids', [])

    if not name:
        return Response({'error': 'Group name is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not participant_ids or len(participant_ids) < 2:
        return Response({'error': 'At least 2 other participants are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate all participant IDs exist
    valid_users = User.objects.filter(id__in=participant_ids, is_active=True)
    if valid_users.count() != len(participant_ids):
        return Response({'error': 'One or more participants not found'}, status=status.HTTP_400_BAD_REQUEST)

    # Create the group
    group = Conversation.objects.create(
        name=name,
        conversation_type='group',
        admin=request.user,
        created_by=request.user,
    )
    group.participants.add(request.user)
    group.participants.add(*valid_users)

    serializer = ConversationSerializer(group, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_group_members(request, conversation_id):
    """
    Add members to an existing group.
    Body: { participant_ids: number[] }
    """
    try:
        group = Conversation.objects.get(id=conversation_id, conversation_type='group')
    except Conversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    if group.admin != request.user:
        return Response({'error': 'Only the group admin can add members'}, status=status.HTTP_403_FORBIDDEN)

    participant_ids = request.data.get('participant_ids', [])
    if not participant_ids:
        return Response({'error': 'No participants provided'}, status=status.HTTP_400_BAD_REQUEST)

    valid_users = User.objects.filter(id__in=participant_ids, is_active=True)
    existing_ids = set(group.participants.values_list('id', flat=True))
    new_users = [u for u in valid_users if u.id not in existing_ids]

    if new_users:
        group.participants.add(*new_users)

    serializer = ConversationSerializer(group, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def remove_group_member(request, conversation_id, user_id):
    """
    Remove a member from a group (admin only, or self-removal).
    """
    try:
        group = Conversation.objects.get(id=conversation_id, conversation_type='group')
    except Conversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    # Allow self-removal or admin removal
    if request.user.id != user_id and group.admin != request.user:
        return Response({'error': 'Only the group admin can remove members'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user_to_remove = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if not group.participants.filter(id=user_id).exists():
        return Response({'error': 'User is not a member of this group'}, status=status.HTTP_400_BAD_REQUEST)

    group.participants.remove(user_to_remove)

    # If the admin leaves, transfer admin to the next member
    if group.admin_id == user_id:
        next_member = group.participants.first()
        group.admin = next_member
        group.save()

    serializer = ConversationSerializer(group, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def leave_group(request, conversation_id):
    """
    Leave a group conversation.
    """
    try:
        group = Conversation.objects.get(id=conversation_id, conversation_type='group')
    except Conversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    if not group.participants.filter(id=request.user.id).exists():
        return Response({'error': 'You are not a member of this group'}, status=status.HTTP_400_BAD_REQUEST)

    group.participants.remove(request.user)

    # If the admin leaves, transfer admin or delete the group
    if group.admin_id == request.user.id:
        next_member = group.participants.first()
        if next_member:
            group.admin = next_member
            group.save()
        else:
            # No members left, delete the group
            group.delete()
            return Response({'message': 'Group deleted (no members left)'}, status=status.HTTP_200_OK)

    return Response({'message': 'Left group successfully'}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_group(request, conversation_id):
    """
    Update group info (name, avatar) — admin only.
    """
    try:
        group = Conversation.objects.get(id=conversation_id, conversation_type='group')
    except Conversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    if group.admin != request.user:
        return Response({'error': 'Only the group admin can update the group'}, status=status.HTTP_403_FORBIDDEN)

    name = request.data.get('name')
    if name is not None:
        name = name.strip()
        if name:
            group.name = name

    avatar = request.FILES.get('avatar')
    if avatar:
        group.avatar = avatar

    group.save()
    serializer = ConversationSerializer(group, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==================== DM ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_or_create_dm(request, user_id):
    """
    Get an existing DM with another user or create a new one.
    """
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if other_user == request.user:
        return Response({'error': 'Cannot create conversation with yourself'}, status=status.HTTP_400_BAD_REQUEST)

    conversation = Conversation.get_or_create_dm(request.user, other_user)
    if not conversation.created_by:
        conversation.created_by = request.user
        conversation.save()
    serializer = ConversationSerializer(conversation, context={'request': request})
    return Response(serializer.data)


# ==================== MESSAGE ENDPOINTS ====================

class MessageListView(generics.ListAPIView):
    """
    List all messages in a conversation.
    Marks unread messages as seen.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        user = self.request.user

        conversation = Conversation.objects.filter(
            id=conversation_id,
            participants=user
        ).first()

        if not conversation:
            return Message.objects.none()

        # Mark unseen messages as seen
        Message.objects.filter(
            conversation=conversation,
            is_seen=False
        ).exclude(sender=user).update(is_seen=True)

        return Message.objects.filter(conversation=conversation).order_by('timestamp')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request, conversation_id):
    """
    Send a message in a conversation (DM or group).
    Supports text (JSON) and optional file attachment (multipart).
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

    if not conversation.participants.filter(id=request.user.id).exists():
        return Response({'error': 'You are not a participant in this conversation'}, status=status.HTTP_403_FORBIDDEN)

    text = request.data.get('text', '').strip()
    file_attachment = request.FILES.get('file_attachment')

    if not text and not file_attachment:
        return Response({'error': 'Message text or file attachment is required'}, status=status.HTTP_400_BAD_REQUEST)

    message = Message.objects.create(
        conversation=conversation,
        sender=request.user,
        text=text or '',
        file_attachment=file_attachment,
    )

    conversation.save()
    serializer = MessageSerializer(message, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_conversation_seen(request, conversation_id):
    """
    Mark all messages in a conversation as seen.
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

    Message.objects.filter(
        conversation=conversation,
        is_seen=False
    ).exclude(sender=request.user).update(is_seen=True)

    return Response({'message': 'Messages marked as seen'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """
    Get the total unread message count for the current user.
    """
    user = request.user
    conversations = Conversation.objects.filter(participants=user)
    total = sum(conv.get_unread_count(user) for conv in conversations)
    return Response({'unread_count': total})


# ==================== IMAGE UPLOAD ENDPOINT ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_message_image(request):
    """
    Upload an image file for a chat message.

    This endpoint accepts a multipart/form-data POST with an 'image' file.
    The image is saved to the media directory and the URL is returned.
    The frontend then sends a WebSocket message with the image URL.

    POST /api/chat/messages/upload-image/
    Content-Type: multipart/form-data
    Body: { image: <file> }

    Response:
    {
        "image_url": "http://localhost:8000/media/message_images/filename.jpg",
        "message": "Image uploaded successfully"
    }
    """
    image_file = request.FILES.get('image')

    if not image_file:
        return Response(
            {'error': 'No image file provided. Use field name "image".'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file type
    if not image_file.content_type.startswith('image/'):
        return Response(
            {'error': f'Invalid file type: {image_file.content_type}. Only images are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file size (max 10MB)
    if image_file.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File too large. Maximum size is 10MB.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Compress image if over 1MB to save storage
    if image_file.size > 1 * 1024 * 1024:
        try:
            image_file = compress_image_in_memory(image_file)
        except Exception:
            pass  # Continue with original if compression fails

    # Save the image as a Message with type 'IMAGE'
    # This creates a temporary record that the WebSocket consumer can reference
    message = Message.objects.create(
        conversation_id=None,  # Will be set when the WS message is processed
        sender=request.user,
        image=image_file,
        message_type='IMAGE',
        text='',
    )

    # Build the full URL
    request_obj = request
    image_url = request_obj.build_absolute_uri(message.image.url)

    return Response({
        'image_url': image_url,
        'message_id': message.id,
        'message': 'Image uploaded successfully',
    }, status=status.HTTP_201_CREATED)
