from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import GamerProfile
from utils.image_compression import compress_image_in_memory

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'first_name', 'last_name')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        GamerProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    in_game_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'date_joined', 'is_active', 'is_staff', 'is_superuser', 'followers_count', 'following_count', 'in_game_id')

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_in_game_id(self, obj):
        try:
            return obj.gamer_profile.in_game_id or ''
        except Exception:
            return ''


class GamerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    total_posts = serializers.ReadOnlyField()
    total_comments = serializers.ReadOnlyField()
    tournaments_won = serializers.ReadOnlyField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = GamerProfile
        fields = ('id', 'user', 'profile_picture', 'profile_picture_url', 'in_game_id', 'points', 'vip_status', 'created_at', 'updated_at', 'total_posts', 'total_comments', 'tournaments_won', 'followers_count', 'following_count')
        read_only_fields = ('created_at', 'updated_at', 'profile_picture', 'profile_picture_url')
        extra_kwargs = {
            'profile_picture': {'required': False, 'allow_null': True},
        }

    def get_profile_picture_url(self, obj):
        try:
            if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile_picture.url)
                return obj.profile_picture.url
        except (ValueError, AttributeError):
            pass
        return None

    def get_followers_count(self, obj):
        return obj.user.followers.count()

    def get_following_count(self, obj):
        return obj.user.following.count()

    def validate_profile_picture(self, value):
        """Compress profile picture to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:  # Only compress if over 1MB
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value

    def update(self, instance, validated_data):
        # Handle profile_picture upload explicitly
        profile_picture = validated_data.pop('profile_picture', None)
        if profile_picture is not None:
            instance.profile_picture = profile_picture
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs