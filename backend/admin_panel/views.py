from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from forum.models import ForumPost, Comment
from tournaments.models import Tournament, TournamentParticipant, TournamentRegistration
from chat.models import Message
from authentication.models import GamerProfile
from firebase_app import delete_firebase_user
from .permissions import IsAdminUser
from tournaments.serializers import TournamentRegistrationAdminSerializer
from .serializers import (
    UserAdminSerializer, UserUpdateSerializer,
    PostAdminSerializer, CommentAdminSerializer,
    TournamentAdminSerializer, TournamentAdminCreateSerializer,
    TournamentAdminUpdateSerializer, DashboardStatsSerializer,
    TournamentParticipantAdminSerializer
)

User = get_user_model()


class DashboardStatsView(APIView):
    """
    Admin dashboard statistics endpoint.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'banned_users': User.objects.filter(is_active=False).count(),
            'total_posts': ForumPost.objects.count(),
            'published_posts': ForumPost.objects.filter(is_flagged=False).count(),
            'pending_posts': ForumPost.objects.filter(is_flagged=True).count(),
            'total_tournaments': Tournament.objects.count(),
            'active_tournaments': Tournament.objects.filter(status='IN_PROGRESS').count(),
            'completed_tournaments': Tournament.objects.filter(status='COMPLETED').count(),
            'total_messages': Message.objects.count(),
            'total_comments': Comment.objects.count(),
            'new_users_today': User.objects.filter(date_joined__date=today).count(),
            'new_users_week': User.objects.filter(date_joined__gte=week_ago).count(),
            'new_users_month': User.objects.filter(date_joined__gte=month_ago).count(),
        }

        serializer = DashboardStatsSerializer(data=stats)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class UserManagementViewSet(viewsets.ViewSet):
    """
    Admin user management endpoints.
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all users with filtering and search."""
        queryset = User.objects.all().order_by('-date_joined')

        # Search filter
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        # Status filter
        status_filter = request.query_params.get('status', None)
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'banned':
            queryset = queryset.filter(is_active=False)
        elif status_filter == 'staff':
            queryset = queryset.filter(is_staff=True)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        users = queryset[start:end]

        serializer = UserAdminSerializer(users, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })

    def retrieve(self, request, pk=None):
        """Get user details."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserAdminSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ban(self, request, pk=None):
        """Ban a user."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({'error': 'You cannot ban yourself'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save()
        return Response({'status': 'User banned successfully'})

    @action(detail=True, methods=['post'])
    def unban(self, request, pk=None):
        """Unban a user."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = True
        user.save()
        return Response({'status': 'User unbanned successfully'})

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        """Promote user to staff."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user.is_staff = True
        user.save()
        return Response({'status': 'User promoted to staff successfully'})

    @action(detail=True, methods=['post'])
    def demote(self, request, pk=None):
        """Demote user from staff."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({'error': 'You cannot demote yourself'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_staff = False
        user.save()
        return Response({'status': 'User demoted from staff successfully'})

    @action(detail=True, methods=['delete'])
    def delete_user(self, request, pk=None):
        """Delete a user permanently from both Django DB and Firebase."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({'error': 'You cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Delete from Firebase if firebase_uid exists
        firebase_deleted = False
        if user.firebase_uid:
            firebase_deleted = delete_firebase_user(user.firebase_uid)

        # Delete from Django DB (cascades to GamerProfile, posts, comments, etc.)
        user.delete()

        return Response({
            'status': 'User deleted successfully',
            'firebase_deleted': firebase_deleted,
        })

    @action(detail=True, methods=['post'])
    def add_points(self, request, pk=None):
        """Admin can add points (money) to a user's GamerProfile.

        Expected JSON payload:
        {
            "amount": <positive integer>
        }
        """
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        amount = request.data.get('amount')
        if amount is None:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = int(amount)
        except (ValueError, TypeError):
            return Response({'error': 'Amount must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure GamerProfile exists
        profile, _ = GamerProfile.objects.get_or_create(user=user)
        profile.points += amount
        profile.save()
        return Response({
            'status': 'Points added successfully',
            'user_id': user.id,
            'new_balance': profile.points,
        })


class ContentManagementViewSet(viewsets.ViewSet):
    """
    Admin content moderation endpoints.
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def posts(self, request):
        """List all posts for moderation."""
        queryset = ForumPost.objects.all().order_by('-created_at')

        # Filter by status
        status_filter = request.query_params.get('status', None)
        if status_filter == 'published':
            queryset = queryset.filter(is_flagged=False)
        elif status_filter == 'pending':
            queryset = queryset.filter(is_flagged=True)

        # Search
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        posts = queryset[start:end]

        serializer = PostAdminSerializer(posts, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })

    @action(detail=False, methods=['post'])
    def approve_post(self, request):
        """Approve a post."""
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'error': 'post_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            post = ForumPost.objects.get(pk=post_id)
        except ForumPost.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        post.is_flagged = False
        post.save()
        return Response({'status': 'Post approved successfully'})

    @action(detail=False, methods=['post'])
    def reject_post(self, request):
        """Reject/unpublish a post."""
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'error': 'post_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            post = ForumPost.objects.get(pk=post_id)
        except ForumPost.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        post.is_flagged = True
        post.save()
        return Response({'status': 'Post rejected successfully'})

    @action(detail=False, methods=['get'])
    def comments(self, request):
        """List all comments for moderation."""
        queryset = Comment.objects.all().order_by('-created_at')

        # Filter by approval status
        approved = request.query_params.get('approved', None)
        if approved == 'true':
            queryset = queryset.filter(is_flagged=False)
        elif approved == 'false':
            queryset = queryset.filter(is_flagged=True)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        comments = queryset[start:end]

        serializer = CommentAdminSerializer(comments, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })

    @action(detail=False, methods=['post'])
    def approve_comment(self, request):
        """Approve a comment."""
        comment_id = request.data.get('comment_id')
        if not comment_id:
            return Response({'error': 'comment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment = Comment.objects.get(pk=comment_id)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        comment.is_flagged = False
        comment.save()
        return Response({'status': 'Comment approved successfully'})

    @action(detail=False, methods=['delete'])
    def delete_comment(self, request):
        """Delete a comment (also removes from Firebase if stored there)."""
        comment_id = request.query_params.get('comment_id')
        if not comment_id:
            return Response({'error': 'comment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment = Comment.objects.get(pk=comment_id)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Delete from Firebase Firestore if comment data was synced
        try:
            from firebase_app import delete_firestore_document
            delete_firestore_document('comments', str(comment_id))
        except Exception:
            pass  # Continue even if Firebase deletion fails

        comment.delete()
        return Response({'status': 'Comment deleted successfully'})


class TournamentManagementViewSet(viewsets.ViewSet):
    """
    Admin tournament management endpoints.
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all tournaments."""
        queryset = Tournament.objects.all().order_by('-created_at')

        # Filter by status
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Search
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(game_name__icontains=search)
            )

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        tournaments = queryset[start:end]

        serializer = TournamentAdminSerializer(tournaments, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })

    def create(self, request):
        """Create a new tournament."""
        serializer = TournamentAdminCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tournament = serializer.save(created_by=request.user)
        tournament.update_status()
        return Response(
            TournamentAdminSerializer(tournament).data,
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, pk=None):
        """Get tournament details."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TournamentAdminSerializer(tournament)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """Update a tournament."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TournamentAdminUpdateSerializer(
            tournament, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        tournament = serializer.save()
        tournament.update_status()
        return Response(TournamentAdminSerializer(tournament).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a tournament."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        tournament.status = 'IN_PROGRESS'
        tournament.save()
        return Response({'status': 'Tournament started successfully'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete a tournament."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        tournament.status = 'COMPLETED'
        tournament.save()
        return Response({'status': 'Tournament completed successfully'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a tournament."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        tournament.status = 'CANCELLED'
        tournament.save()
        return Response({'status': 'Tournament cancelled successfully'})

    @action(detail=True, methods=['delete'])
    def delete_tournament(self, request, pk=None):
        """Delete a tournament."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        tournament.delete()
        return Response({'status': 'Tournament deleted successfully'})

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """List all participants of a tournament with username and Game ID."""
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        participants = TournamentParticipant.objects.filter(
            tournament=tournament
        ).select_related('gamer', 'gamer__gamer_profile').order_by('-joined_at')

        # Search filter
        search = request.query_params.get('search', None)
        if search:
            participants = participants.filter(
                Q(gamer__username__icontains=search) |
                Q(gamer__gamer_profile__in_game_id__icontains=search)
            )

        # Payment status filter
        payment_filter = request.query_params.get('payment_status', None)
        if payment_filter:
            participants = participants.filter(payment_status=payment_filter)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        start = (page - 1) * page_size
        end = start + page_size

        total = participants.count()
        participants_page = participants[start:end]

        serializer = TournamentParticipantAdminSerializer(participants_page, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'tournament': {
                'id': tournament.id,
                'title': tournament.title,
                'game_name': tournament.game_name,
                'slots_available': tournament.slots_available,
                'slots_filled': tournament.slots_filled,
            },
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })

    @action(detail=True, methods=['get'])
    def registrations(self, request, pk=None):
        """
        List all manual payment registrations for a tournament.
        Returns TournamentRegistration records with payment details
        for admin review and approval.
        """
        try:
            tournament = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        registrations = TournamentRegistration.objects.filter(
            tournament=tournament
        ).select_related('user').order_by('-created_at')

        # Search filter
        search = request.query_params.get('search', None)
        if search:
            registrations = registrations.filter(
                Q(user__username__icontains=search) |
                Q(transaction_id__icontains=search) |
                Q(sender_number__icontains=search)
            )

        # Payment status filter
        status_filter = request.query_params.get('payment_status', None)
        if status_filter:
            registrations = registrations.filter(payment_status=status_filter)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        start = (page - 1) * page_size
        end = start + page_size

        total = registrations.count()
        registrations_page = registrations[start:end]

        serializer = TournamentRegistrationAdminSerializer(registrations_page, many=True)
        return Response({
            'results': serializer.data,
            'count': total,
            'tournament': {
                'id': tournament.id,
                'title': tournament.title,
                'game_name': tournament.game_name,
                'slots_available': tournament.slots_available,
                'slots_filled': tournament.slots_filled,
            },
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        })


class RecentActivityView(APIView):
    """
    Get recent activity for admin dashboard.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        recent_users = User.objects.order_by('-date_joined')[:5]
        recent_posts = ForumPost.objects.order_by('-created_at')[:5]
        recent_tournaments = Tournament.objects.order_by('-created_at')[:5]

        return Response({
            'recent_users': UserAdminSerializer(recent_users, many=True).data,
            'recent_posts': PostAdminSerializer(recent_posts, many=True).data,
            'recent_tournaments': TournamentAdminSerializer(recent_tournaments, many=True).data,
        })
