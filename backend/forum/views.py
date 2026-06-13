from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import ForumPost, Comment
from .serializers import (
    ForumPostSerializer,
    ForumPostCreateSerializer,
    CommentSerializer,
)

User = get_user_model()
from .moderation import moderate_content
from authentication.permissions import IsOwnerOrReadOnly


class ForumPostListCreateView(generics.ListCreateAPIView):
    queryset = ForumPost.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'author', 'is_flagged']
    search_fields = ['content', 'author__username']
    ordering_fields = ['created_at', 'upvote_count', 'comment_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ForumPostCreateSerializer
        return ForumPostSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        author = self.request.user
        post = serializer.save(author=author)

        content_to_check = post.content or ''
        if content_to_check:
            moderation_result = moderate_content(content_to_check)
            if moderation_result['is_flagged']:
                post.is_flagged = True
                post.flagged_reason = moderation_result['reason']
                post.save()

        return post

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            post = self.perform_create(serializer)

            return Response({
                'post': ForumPostSerializer(post, context={'request': request}).data,
                'message': 'Post created successfully'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to create post'
            }, status=status.HTTP_400_BAD_REQUEST)


class ForumPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ForumPost.objects.all()
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        post = serializer.save()

        content_to_check = post.content or ''
        if content_to_check:
            moderation_result = moderate_content(content_to_check)
            if moderation_result['is_flagged']:
                post.is_flagged = True
                post.flagged_reason = moderation_result['reason']
                post.save()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Delete from Firebase Firestore if synced
            try:
                from firebase_app import delete_firestore_document
                delete_firestore_document('posts', str(instance.id))
            except Exception:
                pass

            # Delete the image file from media storage
            if instance.image:
                instance.image.delete(save=False)
            self.perform_destroy(instance)
            return Response({
                'message': 'Post deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to delete post'
            }, status=status.HTTP_400_BAD_REQUEST)


class CommentListCreateView(generics.ListCreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['post', 'author', 'is_flagged']
    search_fields = ['content', 'author__username']
    ordering_fields = ['created_at', 'upvote_count']
    ordering = ['created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        post_id = self.request.query_params.get('post')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        return queryset

    def perform_create(self, serializer):
        post_id = self.request.data.get('post')
        if not post_id:
            raise ValueError("Post ID is required")

        try:
            post = ForumPost.objects.get(id=post_id)
        except ForumPost.DoesNotExist:
            raise ValueError("Post not found")

        comment = serializer.save(author=self.request.user, post=post)

        moderation_result = moderate_content(comment.content)
        if moderation_result['is_flagged']:
            comment.is_flagged = True
            comment.save()

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            return Response({
                'comment': CommentSerializer(serializer.instance, context={'request': request}).data,
                'message': 'Comment added successfully'
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to create comment'
            }, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_update(self, serializer):
        comment = serializer.save()

        moderation_result = moderate_content(comment.content)
        if moderation_result['is_flagged']:
            comment.is_flagged = True
            comment.save()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            try:
                from firebase_app import delete_firestore_document
                delete_firestore_document('comments', str(instance.id))
            except Exception:
                pass

            self.perform_destroy(instance)
            return Response({
                'message': 'Comment deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to delete comment'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def post_upvote(request, pk):
    try:
        post = ForumPost.objects.get(pk=pk)
    except ForumPost.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action', 'upvote')

    if action == 'upvote':
        success = post.upvote(request.user)
        message = 'Post upvoted' if success else 'Already upvoted'
    elif action == 'remove':
        success = post.remove_upvote(request.user)
        message = 'Upvote removed' if success else 'Not upvoted yet'
    else:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': message,
        'upvote_count': post.upvote_count
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def comment_upvote(request, pk):
    try:
        comment = Comment.objects.get(pk=pk)
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action', 'upvote')

    if action == 'upvote':
        success = comment.upvote(request.user)
        message = 'Comment upvoted' if success else 'Already upvoted'
    elif action == 'remove':
        success = comment.remove_upvote(request.user)
        message = 'Upvote removed' if success else 'Not upvoted yet'
    else:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': message,
        'upvote_count': comment.upvote_count
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def forum_stats(request):
    total_posts = ForumPost.objects.filter(is_flagged=False).count()
    total_comments = Comment.objects.filter(is_flagged=False).count()
    total_authors = User.objects.filter(forum_posts__isnull=False).distinct().count()

    return Response({
        'total_posts': total_posts,
        'total_comments': total_comments,
        'total_authors': total_authors,
    })
