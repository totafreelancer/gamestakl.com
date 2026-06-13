from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db.models import Q, Count, Sum, F
from django.utils import timezone
import uuid
from datetime import timedelta
from .models import Tournament, TournamentParticipant, TournamentMatch, TournamentRegistration
from utils.image_compression import compress_image_in_memory
from .serializers import (
    TournamentSerializer,
    TournamentCreateSerializer,
    TournamentListSerializer,
    TournamentParticipantSerializer,
    TournamentParticipantCreateSerializer,
    TournamentMatchSerializer,
    TournamentMatchUpdateSerializer,
    TournamentJoinSerializer,
    TournamentPaymentSerializer,
    TournamentBracketSerializer,
    TournamentStatsSerializer,
    TournamentRegistrationSerializer,
    TournamentRegistrationAdminSerializer,
)
from .brackets import auto_generate_bracket, get_tournament_bracket
from .payments import (
    process_tournament_payment,
    verify_tournament_payment,
    approve_manual_payment as approve_manual_payment_service,
    reject_manual_payment as reject_manual_payment_service,
)
from authentication.permissions import IsOwnerOrReadOnly


class TournamentListCreateView(generics.ListCreateAPIView):
    queryset = Tournament.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['game_name', 'status', 'is_active']
    search_fields = ['title', 'description', 'game_name']
    ordering_fields = ['start_time', 'entry_fee', 'prize_pool', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TournamentCreateSerializer
        return TournamentListSerializer
    
    def perform_create(self, serializer):
        tournament = serializer.save(created_by=self.request.user)
        tournament.update_status()


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def perform_update(self, serializer):
        tournament = serializer.save()
        tournament.update_status()
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Delete from Firebase Firestore if synced
            try:
                from firebase_app import delete_firestore_document
                delete_firestore_document('tournaments', str(instance.id))
            except Exception:
                pass  # Continue even if Firebase deletion fails

            self.perform_destroy(instance)
            return Response({
                'message': 'Tournament deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to delete tournament'
            }, status=status.HTTP_400_BAD_REQUEST)


class TournamentParticipantListView(generics.ListCreateAPIView):
    queryset = TournamentParticipant.objects.all()
    serializer_class = TournamentParticipantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tournament', 'gamer', 'payment_status']
    search_fields = ['gamer__username', 'gamer__email']
    ordering_fields = ['joined_at']
    ordering = ['-joined_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TournamentParticipantCreateSerializer
        return TournamentParticipantSerializer
    
    def perform_create(self, serializer):
        # Save in_game_id from user's profile
        try:
            in_game_id = self.request.user.gamer_profile.in_game_id or ''
        except Exception:
            in_game_id = ''
        participant = serializer.save(gamer=self.request.user, in_game_id=in_game_id)
        
        # Update tournament slots
        tournament = participant.tournament
        tournament.joined_slots += 1
        tournament.update_status()
        tournament.save()


class TournamentParticipantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TournamentParticipant.objects.all()
    serializer_class = TournamentParticipantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            tournament = instance.tournament
            
            # Update tournament slots
            tournament.joined_slots -= 1
            tournament.update_status()
            tournament.save()
            
            self.perform_destroy(instance)
            return Response({
                'message': 'Participant removed successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Failed to remove participant'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def join_tournament(request, pk):
    try:
        tournament = Tournament.objects.get(id=pk)
        
        # Check if user already joined
        if TournamentParticipant.objects.filter(tournament=tournament, gamer=request.user).exists():
            return Response({
                'error': 'You have already joined this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not tournament.can_join(request.user):
            return Response({
                'error': 'Cannot join this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user has a Game ID in their profile
        try:
            profile = request.user.gamer_profile
            if not profile.in_game_id:
                return Response({
                    'error': 'You must have a Game ID in your profile to join a tournament. Please update your profile first.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                'error': 'You must have a Gamer Profile with a Game ID to join a tournament.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TournamentJoinSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            payment_gateway = serializer.validated_data['payment_gateway']

            try:
                with transaction.atomic():
                    # Re-fetch tournament inside the lock to avoid race conditions
                    tournament = Tournament.objects.select_for_update().get(id=pk)

                    # Re-check capacity inside the transaction
                    if tournament.is_full:
                        return Response({
                            'error': 'Tournament is full'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    # Create participant with in_game_id
                    try:
                        in_game_id = request.user.gamer_profile.in_game_id or ''
                    except Exception:
                        in_game_id = ''

                    participant = TournamentParticipant.objects.create(
                        tournament=tournament,
                        gamer=request.user,
                        in_game_id=in_game_id
                    )

                    # Update tournament slots
                    tournament.joined_slots += 1
                    tournament.update_status()
                    tournament.save()

                    # ------------------------------------------------------------------
                    # Point-based automatic payment
                    # If the user has enough points, deduct points and mark PAID.
                    # Otherwise, fall through to the selected payment gateway.
                    # ------------------------------------------------------------------
                    gamer_profile = request.user.gamer_profile
                    entry_fee = tournament.entry_fee

                    if gamer_profile.points >= entry_fee:
                        # deduct entry fee from user's points
                        gamer_profile.points -= entry_fee
                        gamer_profile.save()

                        # mark participant as paid directly
                        participant.payment_status = 'PAID'
                        participant.payment_transaction_id = f'POINTS_{uuid.uuid4().hex[:12].upper()}'
                        participant.payment_amount = entry_fee
                        participant.save()

                        return Response({
                            'message': 'Tournament joined successfully (points deducted)',
                            'participant_id': participant.id,
                            'transaction_id': participant.payment_transaction_id,
                            'payment_status': 'PAID',
                        })

                    # Not enough points — use the selected payment gateway
                    payment_result = process_tournament_payment(
                        participant.id,
                        payment_gateway
                    )

                    if payment_result['success']:
                        return Response({
                            'message': 'Tournament joined successfully',
                            'participant_id': participant.id,
                            'transaction_id': payment_result['transaction_id'],
                            'payment_url': payment_result.get('payment_url')
                        })
                    else:
                        # Remove participant if payment failed
                        participant.delete()
                        # Revert tournament slots
                        tournament.joined_slots -= 1
                        tournament.update_status()
                        tournament.save()
                        return Response({
                            'error': payment_result['message']
                        }, status=status.HTTP_400_BAD_REQUEST)

            except Exception as e:
                return Response({
                    'error': f'Failed to join tournament: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Tournament.DoesNotExist:
        return Response({
            'error': 'Tournament not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        error_msg = str(e)
        if 'unique_together' in error_msg.lower() or 'unique constraint' in error_msg.lower() or 'IntegrityError' in type(e).__name__:
            return Response({
                'error': 'You have already joined this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'error': f'Failed to join tournament: {error_msg}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_payment(request, pk):
    try:
        participant = TournamentParticipant.objects.get(id=pk)
        
        if participant.gamer != request.user:
            return Response({
                'error': 'Unauthorized'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TournamentPaymentSerializer(data=request.data)
        if serializer.is_valid():
            transaction_id = serializer.validated_data['transaction_id']
            
            verification_result = verify_tournament_payment(
                participant_id,
                transaction_id
            )
            
            if verification_result['success']:
                return Response({
                    'message': 'Payment verified successfully',
                    'payment_status': verification_result['payment_status']
                })
            else:
                return Response({
                    'error': verification_result['message']
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except TournamentParticipant.DoesNotExist:
        return Response({
            'error': 'Participant not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_bracket(request, pk):
    try:
        tournament = Tournament.objects.get(id=pk)
        
        if tournament.created_by != request.user:
            return Response({
                'error': 'Only tournament creator can generate bracket'
            }, status=status.HTTP_403_FORBIDDEN)
        
        success, message = auto_generate_bracket(pk)
        
        if success:
            return Response({
                'message': message
            })
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Tournament.DoesNotExist:
        return Response({
            'error': 'Tournament not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_bracket(request, pk):
    try:
        bracket_structure = get_tournament_bracket(pk)
        if bracket_structure:
            return Response({
                'tournament_id': pk,
                'bracket_structure': bracket_structure
            })
        else:
            return Response({
                'error': 'Tournament not found or bracket not generated'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_manual_payment_proof(request, pk):
    """Submit proof of manual payment (admin approval required)"""
    try:
        participant = TournamentParticipant.objects.get(id=pk)
        
        if participant.gamer != request.user:
            return Response({
                'error': 'Unauthorized'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return Response({
                'error': 'This is not a manual payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment is already processed
        if participant.payment_status == 'PAID':
            return Response({
                'error': 'Payment already approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get payment proof from request
        payment_proof = request.FILES.get('payment_proof')
        payment_note = request.data.get('payment_note', '')
        
        if not payment_proof:
            return Response({
                'error': 'Payment proof is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Compress payment proof image if over 1MB
        if payment_proof.size > 1 * 1024 * 1024:
            try:
                payment_proof = compress_image_in_memory(payment_proof)
            except Exception:
                return Response({'error': 'Failed to process image. Please try a different file.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update participant with payment proof info
        participant.payment_proof = payment_proof
        participant.payment_note = payment_note
        participant.payment_status = 'PENDING_ADMIN_APPROVAL'
        participant.save()
        
        return Response({
            'message': 'Payment proof submitted successfully. Waiting for admin approval.',
            'participant_id': participant.id,
            'transaction_id': participant.payment_transaction_id,
            'payment_status': 'PENDING_ADMIN_APPROVAL'
        })
    
    except TournamentParticipant.DoesNotExist:
        return Response({
            'error': 'Participant not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to submit payment proof: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_manual_payment_status(request, pk):
    """Get manual payment status"""
    try:
        participant = TournamentParticipant.objects.get(id=pk)
        
        if participant.gamer != request.user:
            return Response({
                'error': 'Unauthorized'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return Response({
                'error': 'This is not a manual payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'participant_id': participant.id,
            'tournament_title': participant.tournament.title,
            'entry_fee': str(participant.tournament.entry_fee),
            'payment_status': participant.payment_status,
            'payment_transaction_id': participant.payment_transaction_id,
            'payment_note': getattr(participant, 'payment_note', ''),
            'payment_proof_url': participant.payment_proof.url if participant.payment_proof else None,
            'submitted_at': participant.payment_proof.name if participant.payment_proof else None,
            'approved_at': getattr(participant, 'approved_at', None),
            'rejected_at': getattr(participant, 'rejected_at', None),
            'rejection_reason': getattr(participant, 'rejection_reason', '')
        })
    
    except TournamentParticipant.DoesNotExist:
        return Response({
            'error': 'Participant not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to get payment status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def approve_manual_payment(request, pk):
    """Approve manual payment (admin only)"""
    try:
        participant = TournamentParticipant.objects.get(id=pk)
        
        # Check if user is admin
        if not request.user.is_staff:
            return Response({
                'error': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Verify it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return Response({
                'error': 'This is not a manual payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment is already processed
        if participant.payment_status == 'PAID':
            return Response({
                'error': 'Payment already approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment proof exists
        if not participant.payment_proof:
            return Response({
                'error': 'Payment proof is required before approval'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Process the payment
        result = approve_manual_payment_service(participant.id, request.user)
        
        if result['success']:
            return Response({
                'message': result['message'],
                'payment_status': 'PAID',
                'participant_id': participant.id
            })
        else:
            return Response({
                'error': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except TournamentParticipant.DoesNotExist:
        return Response({
            'error': 'Participant not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to approve payment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reject_manual_payment(request, pk):
    """Reject manual payment (admin only)"""
    try:
        participant = TournamentParticipant.objects.get(id=pk)
        
        # Check if user is admin
        if not request.user.is_staff:
            return Response({
                'error': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Verify it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return Response({
                'error': 'This is not a manual payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment is already processed
        if participant.payment_status == 'PAID':
            return Response({
                'error': 'Payment already approved, cannot reject'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get rejection reason
        rejection_reason = request.data.get('rejection_reason', 'Payment rejected by admin')
        
        # Process the rejection
        result = reject_manual_payment_service(participant.id, request.user, rejection_reason)
        
        if result['success']:
            return Response({
                'message': result['message'],
                'payment_status': 'FAILED',
                'participant_id': participant.id,
                'rejection_reason': rejection_reason
            })
        else:
            return Response({
                'error': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except TournamentParticipant.DoesNotExist:
        return Response({
            'error': 'Participant not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to reject payment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_pending_manual_payments(request):
    """Get all pending manual payments (admin only)"""
    if not request.user.is_staff:
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get all manual payments that are pending approval
        pending_payments = TournamentParticipant.objects.filter(
            payment_transaction_id__startswith='MANUAL_',
            payment_status__in=['PENDING', 'PENDING_ADMIN_APPROVAL']
        ).select_related('tournament', 'gamer').order_by('-joined_at')
        
        payments_data = []
        for payment in pending_payments:
            payments_data.append({
                'id': payment.id,
                'tournament_title': payment.tournament.title,
                'gamer_username': payment.gamer.username,
                'gamer_email': payment.gamer.email,
                'entry_fee': str(payment.tournament.entry_fee),
                'payment_status': payment.payment_status,
                'payment_transaction_id': payment.payment_transaction_id,
                'payment_note': getattr(payment, 'payment_note', ''),
                'payment_proof_url': payment.payment_proof.url if payment.payment_proof else None,
                'joined_at': payment.joined_at,
                'submitted_at': payment.payment_proof.name if payment.payment_proof else None
            })
        
        return Response({
            'pending_payments': payments_data,
            'count': len(payments_data)
        })
    
    except Exception as e:
        return Response({
            'error': f'Failed to get pending payments: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TournamentMatchListView(generics.ListCreateAPIView):
    queryset = TournamentMatch.objects.all()
    serializer_class = TournamentMatchSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tournament', 'round', 'status']
    search_fields = ['participant1__gamer__username', 'participant2__gamer__username']
    ordering_fields = ['match_number', 'scheduled_time']
    ordering = ['match_number']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tournament_id = self.request.query_params.get('tournament')
        if tournament_id:
            queryset = queryset.filter(tournament_id=tournament_id)
        return queryset


class TournamentMatchDetailView(generics.RetrieveUpdateAPIView):
    queryset = TournamentMatch.objects.all()
    serializer_class = TournamentMatchUpdateSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return TournamentMatchUpdateSerializer
        return TournamentMatchSerializer


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_match_score(request, pk):
    try:
        match = TournamentMatch.objects.get(id=pk)
        
        # Check if user is tournament creator or match participant
        if (match.tournament.created_by != request.user and 
            match.participant1 != request.user.gamer_profile and 
            match.participant2 != request.user.gamer_profile):
            return Response({
                'error': 'Unauthorized to update this match'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TournamentMatchUpdateSerializer(match, data=request.data)
        if serializer.is_valid():
            serializer.save()
            
            # If match is completed, update tournament status if it's the final
            if match.status == 'COMPLETED' and match.round == 'FINAL':
                tournament = match.tournament
                tournament.status = 'COMPLETED'
                tournament.save()
            
            return Response({
                'message': 'Match updated successfully',
                'match': TournamentMatchSerializer(match).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except TournamentMatch.DoesNotExist:
        return Response({
            'error': 'Match not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def tournament_stats(request):
    total_tournaments = Tournament.objects.count()
    active_tournaments = Tournament.objects.filter(is_active=True).count()
    completed_tournaments = Tournament.objects.filter(status='COMPLETED').count()
    total_participants = TournamentParticipant.objects.count()
    total_prize_pool = Tournament.objects.aggregate(Sum('prize_pool'))['prize_pool__sum'] or 0
    
    return Response({
        'total_tournaments': total_tournaments,
        'active_tournaments': active_tournaments,
        'completed_tournaments': completed_tournaments,
        'total_participants': total_participants,
        'total_prize_pool': total_prize_pool
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def upcoming_tournaments(request):
    tournaments = Tournament.objects.filter(
        start_time__gte=timezone.now(),
        status__in=['UPCOMING', 'REGISTRATION_OPEN']
    ).order_by('start_time')[:3]
    
    serializer = TournamentListSerializer(tournaments, many=True)
    return Response({
        'tournaments': serializer.data
    })


# ------------------------------------------------------------------
# Admin endpoint: Add points to a user's GamerProfile
# ------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_points_to_user(request, user_id):
    """Admin can add points (credits) to a user's profile.
    Expected payload: {"points": <int>}
    """
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        points_to_add = int(request.data.get('points', 0))
    except (ValueError, TypeError):
        return Response({'error': 'Invalid points value'}, status=status.HTTP_400_BAD_REQUEST)

    if points_to_add <= 0:
        return Response({'error': 'Points must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from authentication.models import GamerProfile
        profile = GamerProfile.objects.get(user__id=user_id)
        profile.points += points_to_add
        profile.save()
        return Response({
            'message': f'Added {points_to_add} points to user {profile.user.username}',
            'total_points': profile.points,
        })
    except GamerProfile.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_pending_manual_payments(request):
    """Get all pending manual payments (admin only)"""
    if not request.user.is_staff:
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        pending = TournamentParticipant.objects.filter(
            payment_transaction_id__startswith='MANUAL_',
            payment_status__in=['PENDING', 'PENDING_ADMIN_APPROVAL']
        ).select_related('tournament', 'gamer').order_by('-joined_at')

        data = []
        for p in pending:
            data.append({
                'id': p.id,
                'tournament_title': p.tournament.title,
                'gamer_username': p.gamer.username,
                'gamer_email': p.gamer.email,
                'entry_fee': str(p.tournament.entry_fee),
                'payment_status': p.payment_status,
                'payment_transaction_id': p.payment_transaction_id,
                'payment_note': getattr(p, 'payment_note', ''),
                'payment_proof_url': p.payment_proof.url if p.payment_proof else None,
                'joined_at': p.joined_at,
                'submitted_at': p.payment_proof.name if p.payment_proof else None,
            })

        return Response({
            'pending_payments': data,
            'count': len(data)
        })
    except Exception as e:
        return Response({
            'error': f'Failed to get pending payments: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ══════════════════════════════════════════════════════════════════
# Manual Payment Registration Views
# ══════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_registration(request):
    """
    Flat endpoint for manual payment tournament registration.
    POST /api/tournaments/registrations/

    Expected payload:
    {
        "tournament": 5,
        "team_name": "Optional Team Name",
        "player_game_ids": {
            "player1": {"ign": "PlayerName", "uid": "123456"}
        },
        "payment_method": "BKASH",
        "sender_number": "01834775351",
        "transaction_id": "ABC123XYZ"
    }
    """
    data = request.data.copy()

    # Inject the authenticated user
    data['user'] = request.user.pk

    serializer = TournamentRegistrationSerializer(
        data=data,
        context={'request': request}
    )
    if serializer.is_valid():
        registration = serializer.save(
            user=request.user,
            payment_status='PENDING'
        )
        return Response({
            'message': 'Registration submitted successfully! '
                       'Your payment is pending admin approval.',
            'registration_id': registration.id,
            'payment_status': registration.payment_status,
            'tournament_title': registration.tournament.title,
            'entry_fee': str(registration.tournament.entry_fee),
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def register_for_tournament(request, pk):
    """
    Register for a tournament with manual payment.
    Creates a TournamentRegistration with PENDING status.

    Expected payload:
    {
        "team_name": "Optional Team Name",
        "player_game_ids": {
            "player1": {"ign": "PlayerName", "uid": "123456"},
            "player2": {"ign": "TeammateName", "uid": "789012"}
        },
        "payment_method": "BKASH",
        "sender_number": "017XXXXXXXX",
        "transaction_id": "ABC123XYZ"
    }
    """
    try:
        tournament = Tournament.objects.get(id=pk)
    except Tournament.DoesNotExist:
        return Response(
            {'error': 'Tournament not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if tournament is joinable
    if tournament.is_full:
        return Response(
            {'error': 'This tournament is full.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not tournament.is_active:
        return Response(
            {'error': 'This tournament is not active.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already registered
    if TournamentRegistration.objects.filter(
        tournament=tournament, user=request.user
    ).exists():
        return Response(
            {'error': 'You have already registered for this tournament.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate and create registration
    serializer = TournamentRegistrationSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        registration = serializer.save(
            user=request.user,
            tournament=tournament,
            payment_status='PENDING'
        )
        return Response({
            'message': 'Registration submitted successfully! '
                       'Your payment is pending admin approval.',
            'registration_id': registration.id,
            'payment_status': registration.payment_status,
            'tournament_title': tournament.title,
            'entry_fee': str(tournament.entry_fee),
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_my_registration_status(request, pk):
    """
    Get the current user's registration and payment status for a tournament.
    Returns room details if payment is approved.
    """
    try:
        tournament = Tournament.objects.get(id=pk)
    except Tournament.DoesNotExist:
        return Response(
            {'error': 'Tournament not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        registration = TournamentRegistration.objects.get(
            tournament=tournament, user=request.user
        )
    except TournamentRegistration.DoesNotExist:
        return Response(
            {'error': 'You have not registered for this tournament.'},
            status=status.HTTP_404_NOT_FOUND
        )

    response_data = {
        'registration_id': registration.id,
        'tournament_title': tournament.title,
        'tournament_id': tournament.id,
        'game_name': tournament.game_name,
        'match_type': tournament.match_type,
        'entry_fee': str(tournament.entry_fee),
        'payment_method': registration.payment_method,
        'payment_status': registration.payment_status,
        'transaction_id': registration.transaction_id,
        'team_name': registration.team_name,
        'player_game_ids': registration.player_game_ids,
        'rejection_reason': registration.rejection_reason,
        'created_at': registration.created_at,
    }

    # Only reveal room details if approved
    if registration.payment_status == 'APPROVED':
        response_data['room_id'] = tournament.room_id
        response_data['room_password'] = tournament.room_password

    return Response(response_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_list_pending_registrations(request):
    """
    Admin endpoint: List all pending tournament registrations.
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    registrations = TournamentRegistration.objects.filter(
        payment_status='PENDING'
    ).select_related('tournament', 'user').order_by('-created_at')

    serializer = TournamentRegistrationAdminSerializer(registrations, many=True)
    return Response({
        'registrations': serializer.data,
        'count': registrations.count(),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_approve_registration(request, registration_id):
    """
    Admin endpoint: Approve a tournament registration.
    Creates a TournamentParticipant and updates slot count.
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        registration = TournamentRegistration.objects.get(id=registration_id)
    except TournamentRegistration.DoesNotExist:
        return Response(
            {'error': 'Registration not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if registration.payment_status != 'PENDING':
        return Response(
            {'error': f'Registration is already {registration.payment_status.lower()}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            participant = registration.approve(request.user)
        return Response({
            'message': 'Registration approved successfully!',
            'registration_id': registration.id,
            'participant_id': participant.id,
            'user': participant.gamer.username,
            'tournament': registration.tournament.title,
        })
    except Exception as e:
        return Response(
            {'error': f'Failed to approve registration: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_reject_registration(request, registration_id):
    """
    Admin endpoint: Reject a tournament registration.
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        registration = TournamentRegistration.objects.get(id=registration_id)
    except TournamentRegistration.DoesNotExist:
        return Response(
            {'error': 'Registration not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if registration.payment_status != 'PENDING':
        return Response(
            {'error': f'Registration is already {registration.payment_status.lower()}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    rejection_reason = request.data.get('rejection_reason', 'Rejected by admin')
    registration.reject(request.user, rejection_reason)

    return Response({
        'message': 'Registration rejected.',
        'registration_id': registration.id,
        'rejection_reason': rejection_reason,
    })


# ══════════════════════════════════════════════════════════════════
# TournamentRegistration ViewSet
# ══════════════════════════════════════════════════════════════════

class TournamentRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tournament registrations with manual payment.

    Endpoints:
      POST   /api/tournaments/registrations/          → Create registration (auth user)
      GET    /api/tournaments/registrations/          → List user's registrations
      GET    /api/tournaments/registrations/{id}/     → Retrieve a registration
      POST   /api/tournaments/registrations/{id}/approve_participant/  → Admin only

    CRITICAL: perform_create() saves with payment_status='PENDING' and does NOT
    increment the tournament's joined_slots. Slots are ONLY incremented when an
    admin calls approve_participant, which atomically verifies capacity and
    increments the counter.
    """
    serializer_class = TournamentRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Non-admin users see only their own registrations; admins see all."""
        user = self.request.user
        if user.is_staff:
            return TournamentRegistration.objects.all().select_related('tournament', 'user')
        return TournamentRegistration.objects.filter(
            user=user
        ).select_related('tournament', 'user')

    def perform_create(self, serializer):
        """
        Save the registration with PENDING status.

        IMPORTANT: This does NOT create a TournamentParticipant record and does
        NOT increment joined_slots. The user is NOT considered a participant until
        an admin approves the payment via approve_participant.
        """
        serializer.save(user=self.request.user, payment_status='PENDING')

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve_participant(self, request, pk=None):
        """
        Admin-only action: approve a pending registration's payment.

        POST /api/tournaments/registrations/{id}/approve_participant/

        Workflow:
          1. Validates the registration is currently PENDING.
          2. Checks tournament slots are NOT already full (race-condition safe).
          3. Calls registration.approve() inside an atomic transaction:
               - Sets registration.payment_status = 'APPROVED'
               - Creates a TournamentParticipant record
               - Increments tournament.joined_slots by 1 (using select_for_update)
               - Updates tournament status
          4. Returns success with participant details and updated slot counts.

        Payload (optional):
          { "rejection_reason": "..." }  — only used if rejecting
        """
        registration = self.get_object()

        # ── Guard: only PENDING registrations can be approved ──────
        if registration.payment_status != 'PENDING':
            return Response(
                {
                    'error': f'Registration is already {registration.payment_status.lower()}. '
                             f'Cannot modify.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Guard: check slot availability before approving ──────
        tournament = registration.tournament
        if tournament.is_full:
            return Response(
                {
                    'error': 'Cannot approve: tournament is already full. '
                             'All slots have been filled.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                participant = registration.approve(request.user)

            return Response({
                'message': 'Payment approved successfully! User is now a participant.',
                'registration_id': registration.id,
                'participant_id': participant.id,
                'user': participant.gamer.username,
                'tournament': tournament.title,
                'payment_status': 'APPROVED',
                'joined_slots': tournament.joined_slots,
                'total_slots': tournament.total_slots,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Failed to approve registration: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject_participant(self, request, pk=None):
        """
        Admin-only action: reject a pending registration's payment.

        POST /api/tournaments/registrations/{id}/reject_participant/

        Payload:
          { "rejection_reason": "Optional reason for rejection" }
        """
        registration = self.get_object()

        if registration.payment_status != 'PENDING':
            return Response(
                {
                    'error': f'Registration is already {registration.payment_status.lower()}. '
                             f'Cannot modify.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        rejection_reason = request.data.get('rejection_reason', 'Rejected by admin')
        registration.reject(request.user, rejection_reason)

        return Response({
            'message': 'Registration rejected.',
            'registration_id': registration.id,
            'payment_status': 'REJECTED',
            'rejection_reason': rejection_reason,
        }, status=status.HTTP_200_OK)