from rest_framework import serializers
from .models import ForumPost, Comment
from .moderation import moderate_content
from utils.image_compression import compress_image_in_memory


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    author_profile_picture = serializers.SerializerMethodField()
    upvote_count = serializers.ReadOnlyField()
    is_reply = serializers.ReadOnlyField()
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'author_id', 'author_profile_picture', 'content', 'parent_comment', 'created_at', 'updated_at', 'upvote_count', 'is_reply']
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_author_profile_picture(self, obj):
        try:
            profile = obj.author.gamer_profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return profile.profile_picture.url
        except Exception:
            pass
        return None
    
    def validate_content(self, value):
        moderation_result = moderate_content(value)
        if moderation_result['is_flagged']:
            raise serializers.ValidationError(
                f"Content flagged: {moderation_result['reason']}. Please review your post."
            )
        return value


class ForumPostSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    author_profile_picture = serializers.SerializerMethodField()
    upvote_count = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    comments = CommentSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    has_image = serializers.SerializerMethodField()
    
    class Meta:
        model = ForumPost
        fields = ['id', 'author', 'author_id', 'author_profile_picture', 'content', 'image', 'image_url', 'has_image', 'category', 'created_at', 'updated_at', 'upvote_count', 'comment_count', 'comments', 'is_flagged']
        read_only_fields = ['author', 'created_at', 'updated_at', 'is_flagged']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_has_image(self, obj):
        return bool(obj.image)

    def get_author_profile_picture(self, obj):
        try:
            profile = obj.author.gamer_profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return profile.profile_picture.url
        except Exception:
            pass
        return None
    
    def validate_content(self, value):
        if value:
            moderation_result = moderate_content(value)
            if moderation_result['is_flagged']:
                raise serializers.ValidationError(
                    f"Content flagged: {moderation_result['reason']}. Please review your post."
                )
        return value


class ForumPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumPost
        fields = ['content', 'image', 'category']
        extra_kwargs = {
            'content': {'required': False, 'allow_blank': True},
            'image': {'required': False, 'allow_null': True},
        }

    def validate_image(self, value):
        """Compress image to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:  # Only compress if over 1MB
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value
    
    def validate_content(self, value):
        if value:
            moderation_result = moderate_content(value)
            if moderation_result['is_flagged']:
                raise serializers.ValidationError(
                    f"Content flagged: {moderation_result['reason']}. Please review your post."
                )
        return value
    
    def validate(self, attrs):
        content = attrs.get('content', '')
        image = attrs.get('image', None)
        if not content.strip() and not image:
            raise serializers.ValidationError(
                "Post must have either content or an image."
            )
        return attrs


class CommentCreateSerializer(serializers.ModelSerializer):
    post = serializers.IntegerField(write_only=True)

    class Meta:
        model = Comment
        fields = ['post', 'content', 'parent_comment']

    def validate_content(self, value):
        moderation_result = moderate_content(value)
        if moderation_result['is_flagged']:
            raise serializers.ValidationError(
                f"Content flagged: {moderation_result['reason']}. Please review your post."
            )
        return value

    def validate_parent_comment(self, value):
        """Ensure parent_comment belongs to the same post."""
        if value is not None:
            post_id = self.initial_data.get('post')
            if post_id and value.post_id != int(post_id):
                raise serializers.ValidationError(
                    "Parent comment does not belong to the same post."
                )
        return value


class PostUpvoteSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['upvote', 'remove_upvote'])


class CommentUpvoteSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['upvote', 'remove_upvote'])


class ForumPostListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    author_profile_picture = serializers.SerializerMethodField()
    upvote_count = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = ['id', 'author', 'author_id', 'author_profile_picture', 'title', 'content', 'image_url', 'category', 'created_at', 'upvote_count', 'comment_count', 'is_flagged']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_author_profile_picture(self, obj):
        try:
            profile = obj.author.gamer_profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return profile.profile_picture.url
        except Exception:
            pass
        return None


class CommentListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    upvote_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at', 'upvote_count', 'is_reply']