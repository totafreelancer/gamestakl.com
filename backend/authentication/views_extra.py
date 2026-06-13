from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Follower, PersonalMessage
from .serializers_extra import FollowerSerializer, PersonalMessageSerializer, UserMiniSerializer
from authentication.serializers import GamerProfileSerializer
from utils.image_compression import compress_image_in_memory

User = get_user_model()


def send_message_notification(message):
    """Send WebSocket notification to the receiver when a new message is created."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            sender = message.sender
            sender_picture = ''
            try:
                if sender.gamer_profile and sender.gamer_profile.profile_picture:
                    sender_picture = sender.gamer_profile.profile_picture.url
            except Exception:
                pass

            async_to_sync(channel_layer.group_send)(
                f'notifications_{message.receiver_id}',
                {
                    'type': 'new_message_notification',
                    'sender_id': sender.id,
                    'sender_username': sender.username,
                    'sender_profile_picture': sender_picture,
                    'content': message.content,
                    'message_id': message.id,
                    'timestamp': str(message.created_at),
                }
            )
    except Exception:
        pass  # Don't let notification failure break message sending

User = get_user_model()


# ==================== USER PROFILE ====================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_profile(request, user_id):
    """Get any user's public profile"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    user_data = UserMiniSerializer(target_user).data
    try:
        profile = target_user.gamer_profile
        profile_data = GamerProfileSerializer(profile, context={'request': request}).data
    except Exception:
        profile_data = None

    return Response({
        'user': user_data,
        'profile': profile_data,
        'profile_picture_url': profile_data.get('profile_picture_url') if profile_data else None,
        'followers_count': target_user.followers.count(),
        'following_count': target_user.following.count(),
        'total_posts': target_user.forum_posts.count(),
        'total_comments': target_user.comments.count(),
    })


# ==================== FOLLOW / UNFOLLOW ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request, user_id):
    """Follow a user"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if target_user == request.user:
        return Response({'error': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

    follower_obj, created = Follower.objects.get_or_create(
        follower=request.user,
        following=target_user
    )

    if not created:
        return Response({'error': 'Already following this user'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': f'You are now following {target_user.username}',
        'follower_count': target_user.followers.count()
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user(request, user_id):
    """Unfollow a user"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    deleted, _ = Follower.objects.filter(
        follower=request.user,
        following=target_user
    ).delete()

    if deleted == 0:
        return Response({'error': 'You are not following this user'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': f'You have unfollowed {target_user.username}',
        'follower_count': target_user.followers.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_followers(request, user_id):
    """Get list of followers of a user"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    followers = Follower.objects.filter(following=target_user)
    serializer = FollowerSerializer(followers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_following(request, user_id):
    """Get list of users that a user is following"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    following = Follower.objects.filter(follower=target_user)
    serializer = FollowerSerializer(following, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def check_follow_status(request, user_id):
    """Check if current user is following a specific user"""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    is_following = Follower.objects.filter(
        follower=request.user,
        following=target_user
    ).exists()

    return Response({
        'is_following': is_following,
        'followers_count': target_user.followers.count(),
        'following_count': target_user.following.count()
    })


# ==================== PERSONAL MESSAGING ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def send_message(request):
    """Send a personal message to another user (text and/or image)"""
    receiver_id = request.data.get('receiver_id')
    content = request.data.get('content', '').strip()
    image = request.FILES.get('image')

    if not receiver_id:
        return Response({'error': 'Receiver ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Convert receiver_id to int
    try:
        receiver_id = int(receiver_id)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid receiver ID'}, status=status.HTTP_400_BAD_REQUEST)

    if not content and not image:
        return Response({'error': 'Message content or image is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Compress image if over 1MB
    if image and image.size > 1 * 1024 * 1024:
        try:
            image = compress_image_in_memory(image)
        except Exception:
            return Response({'error': 'Failed to process image. Please try a different file.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({'error': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)

    if receiver == request.user:
        return Response({'error': 'You cannot send a message to yourself'}, status=status.HTTP_400_BAD_REQUEST)

    message = PersonalMessage.objects.create(
        sender=request.user,
        receiver=receiver,
        content=content or '',
        image=image
    )

    # Send WebSocket notification to receiver
    send_message_notification(message)

    serializer = PersonalMessageSerializer(message, context={'request': request})
    return Response({
        'message': 'Message sent successfully',
        'data': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_conversation(request, user_id):
    """Get conversation between current user and another user"""
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    messages = PersonalMessage.objects.filter(
        (models.Q(sender=request.user) & models.Q(receiver=other_user)) |
        (models.Q(sender=other_user) & models.Q(receiver=request.user))
    ).order_by('created_at')

    # Mark unread messages as read
    PersonalMessage.objects.filter(
        sender=other_user,
        receiver=request.user,
        is_read=False
    ).update(is_read=True)

    serializer = PersonalMessageSerializer(messages, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_message(request, message_id):
    """Delete a personal message (only by sender)"""
    try:
        message = PersonalMessage.objects.get(id=message_id)
    except PersonalMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only sender can delete their own message
    if message.sender != request.user:
        return Response({'error': 'You can only delete your own messages'}, status=status.HTTP_403_FORBIDDEN)

    # Delete the image file from media storage
    if message.image:
        message.image.delete(save=False)

    message.delete()
    return Response({'message': 'Message deleted successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_inbox(request):
    """Get all conversations for current user"""
    from django.db.models import Max, Q

    # Get the latest message from each conversation
    sent = PersonalMessage.objects.filter(
        sender=request.user
    ).values('receiver__id', 'receiver__username').annotate(
        last_message_time=Max('created_at')
    )

    received = PersonalMessage.objects.filter(
        receiver=request.user
    ).values('sender__id', 'sender__username').annotate(
        last_message_time=Max('created_at')
    )

    # Combine and deduplicate
    conversations = {}
    for item in sent:
        uid = item['receiver__id']
        conversations[uid] = {
            'user_id': uid,
            'username': item['receiver__username'],
            'last_message_time': item['last_message_time']
        }
    for item in received:
        uid = item['sender__id']
        if uid not in conversations or item['last_message_time'] > conversations[uid]['last_message_time']:
            conversations[uid] = {
                'user_id': uid,
                'username': item['sender__username'],
                'last_message_time': item['last_message_time']
            }

    # Get unread counts
    unread_counts = {}
    for msg in PersonalMessage.objects.filter(receiver=request.user, is_read=False):
        uid = msg.sender_id
        unread_counts[uid] = unread_counts.get(uid, 0) + 1

    result = []
    for uid, conv in conversations.items():
        conv['unread_count'] = unread_counts.get(uid, 0)
        # Get profile picture
        try:
            other_user = User.objects.get(id=uid)
            profile = other_user.gamer_profile
            conv['profile_picture_url'] = profile.profile_picture.url if profile.profile_picture else None
        except Exception:
            conv['profile_picture_url'] = None
        result.append(conv)

    result.sort(key=lambda x: x['last_message_time'], reverse=True)
    return Response(result)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_unread_count(request):
    """Get total unread message count"""
    count = PersonalMessage.objects.filter(
        receiver=request.user,
        is_read=False
    ).count()
    return Response({'unread_count': count})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_users(request):
    """Search users by username or in_game_id"""
    query = request.query_params.get('q', '').strip()
    if not query or len(query) < 2:
        return Response({'results': []})

    users = User.objects.filter(
        models.Q(username__icontains=query) |
        models.Q(first_name__icontains=query) |
        models.Q(last_name__icontains=query) |
        models.Q(gamer_profile__in_game_id__icontains=query)
    ).exclude(id=request.user.id)[:20]

    results = []
    for u in users:
        in_game_id = None
        profile_picture_url = None
        try:
            profile = u.gamer_profile
            in_game_id = profile.in_game_id
            if profile.profile_picture:
                profile_picture_url = request.build_absolute_uri(profile.profile_picture.url)
        except Exception:
            pass
        results.append({
            'id': u.id,
            'username': u.username,
            'in_game_id': in_game_id,
            'profile_picture_url': profile_picture_url,
        })
    return Response({'results': results})


# Import models.Q for conversation query
from django.db import models
