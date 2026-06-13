from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages — supports TEXT, IMAGE, and FILE types."""
    sender = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_profile_picture = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_id', 'sender_username',
            'sender_profile_picture', 'text', 'image', 'image_url',
            'file_attachment', 'file_url', 'message_type',
            'timestamp', 'is_seen',
        ]
        read_only_fields = ['sender', 'timestamp', 'is_seen']

    def get_sender(self, obj):
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'email': obj.sender.email,
        }

    def get_sender_profile_picture(self, obj):
        try:
            if hasattr(obj.sender, 'gamer_profile') and obj.sender.gamer_profile.profile_picture:
                request = self.context.get('request')
                url = obj.sender.gamer_profile.profile_picture.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return ''

    def get_file_url(self, obj):
        if obj.file_attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file_attachment.url)
            return obj.file_attachment.url
        return ''

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return ''


class ParticipantSerializer(serializers.Serializer):
    """Lightweight serializer for group participants."""
    id = serializers.IntegerField()
    username = serializers.CharField()
    profile_picture = serializers.CharField(allow_blank=True)


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations — supports both DM and group chat."""
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_avatar = serializers.SerializerMethodField()
    admin = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'name', 'conversation_type', 'is_group', 'admin', 'created_by', 'avatar', 'avatar_url',
            'participants', 'participant_count', 'other_user',
            'display_name', 'display_avatar',
            'last_message', 'unread_count', 'created_at', 'updated_at',
        ]

    def get_participants(self, obj):
        participants = []
        for p in obj.participants.all():
            profile_picture = ''
            try:
                if hasattr(p, 'gamer_profile') and p.gamer_profile.profile_picture:
                    request = self.context.get('request')
                    url = p.gamer_profile.profile_picture.url
                    if request:
                        url = request.build_absolute_uri(url)
                    profile_picture = url
            except Exception:
                pass
            participants.append({
                'id': p.id,
                'username': p.username,
                'profile_picture': profile_picture,
            })
        return participants

    def get_last_message(self, obj):
        last_msg = obj.get_last_message()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count(request.user)
        return 0

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and not obj.is_group:
            other = obj.get_other_participant(request.user)
            if other:
                profile_picture = ''
                try:
                    if hasattr(other, 'gamer_profile') and other.gamer_profile.profile_picture:
                        request = self.context.get('request')
                        url = other.gamer_profile.profile_picture.url
                        if request:
                            url = request.build_absolute_uri(url)
                        profile_picture = url
                except Exception:
                    pass
                return {
                    'id': other.id,
                    'username': other.username,
                    'profile_picture': profile_picture,
                }
        return None

    def get_display_name(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_display_name(request.user)
        return obj.name or 'Conversation'

    def get_display_avatar(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            avatar = obj.get_display_avatar(request.user)
            if avatar:
                if self.context.get('request'):
                    return self.context['request'].build_absolute_uri(avatar)
                return avatar
        return None

    def get_admin(self, obj):
        if obj.admin:
            profile_picture = ''
            try:
                if hasattr(obj.admin, 'gamer_profile') and obj.admin.gamer_profile.profile_picture:
                    request = self.context.get('request')
                    url = obj.admin.gamer_profile.profile_picture.url
                    if request:
                        url = request.build_absolute_uri(url)
                    profile_picture = url
            except Exception:
                pass
            return {
                'id': obj.admin.id,
                'username': obj.admin.username,
                'profile_picture': profile_picture,
            }
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return {
                'id': obj.created_by.id,
                'username': obj.created_by.username,
            }
        return None

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_participant_count(self, obj):
        return obj.participants.count()
