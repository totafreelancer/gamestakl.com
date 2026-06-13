from rest_framework import serializers
from .models import Follower, PersonalMessage, GamerProfile
from django.contrib.auth import get_user_model
from utils.image_compression import compress_image_in_memory

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    followers_count = serializers.ReadOnlyField()
    following_count = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'followers_count', 'following_count']


class FollowerSerializer(serializers.ModelSerializer):
    follower = UserMiniSerializer(read_only=True)
    following = UserMiniSerializer(read_only=True)
    follower_id = serializers.IntegerField(write_only=True)
    following_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Follower
        fields = ['id', 'follower', 'following', 'follower_id', 'following_id', 'created_at']
        read_only_fields = ['created_at']


class PersonalMessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    receiver = UserMiniSerializer(read_only=True)
    sender_id = serializers.IntegerField(write_only=True)
    receiver_id = serializers.IntegerField(write_only=True)
    image_url = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = PersonalMessage
        fields = ['id', 'sender', 'receiver', 'sender_id', 'receiver_id', 'sender_profile_picture', 'content', 'image', 'image_url', 'is_read', 'created_at']
        read_only_fields = ['is_read', 'created_at']

    def validate_image(self, value):
        """Compress message image to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:  # Only compress if over 1MB
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_sender_profile_picture(self, obj):
        try:
            profile = obj.sender.gamer_profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return profile.profile_picture.url
        except Exception:
            pass
        return None
