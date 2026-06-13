from rest_framework import serializers
from django.contrib.auth import get_user_model
from forum.models import ForumPost, Comment
from tournaments.models import Tournament, TournamentParticipant
from chat.models import Message
from utils.image_compression import compress_image_in_memory

User = get_user_model()


class UserAdminSerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()
    tournaments_count = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()
    is_banned = serializers.SerializerMethodField()
    in_game_id = serializers.SerializerMethodField()
    points = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser', 'date_joined',
            'last_login', 'posts_count', 'tournaments_count',
            'messages_count', 'is_banned', 'in_game_id', 'points'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_posts_count(self, obj):
        return ForumPost.objects.filter(author=obj).count()

    def get_tournaments_count(self, obj):
        return obj.tournament_participations.count()

    def get_messages_count(self, obj):
        return Message.objects.filter(sender=obj).count()

    def get_is_banned(self, obj):
        return not obj.is_active

    def get_in_game_id(self, obj):
        try:
            return obj.gamer_profile.in_game_id or ''
        except Exception:
            return ''

    def get_points(self, obj):
        try:
            return obj.gamer_profile.points
        except Exception:
            return 0


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['is_active', 'is_staff', 'is_superuser']


class PostAdminSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = [
            'id', 'title', 'content', 'author', 'author_name',
            'created_at', 'updated_at', 'is_flagged', 'category',
            'comments_count', 'likes_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_comments_count(self, obj):
        return Comment.objects.filter(post=obj).count()

    def get_likes_count(self, obj):
        return obj.upvotes.count()


class CommentAdminSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id', 'content', 'author', 'author_name',
            'post', 'post_title', 'created_at', 'is_flagged'
        ]
        read_only_fields = ['id', 'created_at']


class TournamentAdminSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    banner = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'id', 'title', 'description', 'game_name', 'match_type',
            'total_slots', 'joined_slots', 'slots_available', 'slots_filled',
            'start_time', 'status', 'prize_pool', 'entry_fee',
            'room_id', 'room_password', 'banner',
            'participants_count', 'created_by', 'created_by_name',
            'created_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at']

    def get_participants_count(self, obj):
        return obj.participants.count()

    def get_banner(self, obj):
        try:
            if obj.banner and hasattr(obj.banner, 'url'):
                return obj.banner.url
        except (ValueError, AttributeError):
            pass
        return None


class TournamentAdminCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = [
            'title', 'game_name', 'match_type', 'description',
            'entry_fee', 'prize_pool', 'start_time',
            'total_slots', 'rules', 'banner', 'is_active',
            'room_id', 'room_password'
        ]

    def validate_banner(self, value):
        """Compress tournament banner image to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value

    def validate_start_time(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Start time must be in the future")
        return value

    def validate_total_slots(self, value):
        if value < 2:
            raise serializers.ValidationError("Minimum 2 slots required")
        if value > 128:
            raise serializers.ValidationError("Maximum 128 slots allowed")
        if value & (value - 1) != 0:
            raise serializers.ValidationError("Slots must be a power of 2 (2, 4, 8, 16, 32, 64, 128)")
        return value

    def validate_entry_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Entry fee cannot be negative")
        return value

    def validate_prize_pool(self, value):
        if value < 0:
            raise serializers.ValidationError("Prize pool cannot be negative")
        return value


class TournamentAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = [
            'title', 'game_name', 'match_type', 'description',
            'entry_fee', 'prize_pool', 'start_time',
            'total_slots', 'rules', 'banner',
            'is_active', 'status', 'room_id', 'room_password'
        ]

    def validate_banner(self, value):
        """Compress tournament banner image to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value

    def validate_entry_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Entry fee cannot be negative")
        return value

    def validate_prize_pool(self, value):
        if value < 0:
            raise serializers.ValidationError("Prize pool cannot be negative")
        return value


class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    banned_users = serializers.IntegerField()
    total_posts = serializers.IntegerField()
    published_posts = serializers.IntegerField()
    pending_posts = serializers.IntegerField()
    total_tournaments = serializers.IntegerField()
    active_tournaments = serializers.IntegerField()
    completed_tournaments = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    total_comments = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    new_users_week = serializers.IntegerField()
    new_users_month = serializers.IntegerField()


class TournamentParticipantAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin to view tournament participants with username and Game ID."""
    username = serializers.CharField(source='gamer.username', read_only=True)
    email = serializers.CharField(source='gamer.email', read_only=True)
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)

    class Meta:
        model = TournamentParticipant
        fields = [
            'id', 'username', 'email', 'in_game_id',
            'tournament', 'tournament_title',
            'joined_at', 'payment_status',
            'payment_transaction_id', 'payment_amount'
        ]
        read_only_fields = fields
