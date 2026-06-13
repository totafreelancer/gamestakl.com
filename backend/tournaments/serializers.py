from rest_framework import serializers
from django.utils import timezone
from .models import Tournament, TournamentParticipant, TournamentMatch, TournamentRegistration
from authentication.serializers import UserSerializer
from utils.image_compression import compress_image_in_memory


class TournamentSerializer(serializers.ModelSerializer):
    slots_left = serializers.ReadOnlyField()
    registration_percentage = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    participants_count = serializers.SerializerMethodField()
    has_joined = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)
    # Expose new fields alongside legacy aliases
    match_type = serializers.CharField(read_only=True)
    total_slots = serializers.IntegerField(read_only=True)
    joined_slots = serializers.IntegerField(read_only=True)
    banner = serializers.SerializerMethodField()
    tournament_image = serializers.SerializerMethodField()
    room_id = serializers.SerializerMethodField()
    room_password = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ['id', 'title', 'game_name', 'match_type', 'description',
                 'entry_fee', 'prize_pool', 'start_time',
                 'total_slots', 'joined_slots', 'slots_available', 'slots_filled',
                 'slots_left', 'registration_percentage', 'is_full', 'is_active',
                 'status', 'room_id', 'room_password',
                 'banner', 'tournament_image',
                 'created_at', 'updated_at', 'rules',
                 'participants_count', 'has_joined', 'created_by']
        read_only_fields = ['joined_slots', 'slots_filled', 'created_at', 'updated_at',
                           'status', 'created_by']

    def get_participants_count(self, obj):
        return obj.participants.count()

    def get_has_joined(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participants.filter(gamer=request.user).exists()
        return False

    def _get_banner_url(self, obj):
        """Safely get banner URL, returning None if no file is set."""
        try:
            if obj.banner and hasattr(obj.banner, 'url'):
                return obj.banner.url
        except (ValueError, AttributeError):
            pass
        return None

    def get_banner(self, obj):
        return self._get_banner_url(obj)

    def get_tournament_image(self, obj):
        """Legacy alias for banner."""
        return self._get_banner_url(obj)

    def get_room_id(self, obj):
        """Only show room_id if the requesting user is an approved participant."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            is_participant = obj.participants.filter(
                gamer=request.user, payment_status='PAID'
            ).exists()
            if is_participant:
                return obj.room_id
        return None

    def get_room_password(self, obj):
        """Only show room_password if the requesting user is an approved participant."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            is_participant = obj.participants.filter(
                gamer=request.user, payment_status='PAID'
            ).exists()
            if is_participant:
                return obj.room_password
        return None


class TournamentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ['title', 'game_name', 'match_type', 'description',
                 'entry_fee', 'prize_pool', 'start_time',
                 'total_slots', 'rules', 'banner',
                 'room_id', 'room_password']

    def validate_banner(self, value):
        """Compress tournament banner image to under 1MB before saving."""
        if value is None:
            return value
        if value.size > 1 * 1024 * 1024:  # Only compress if over 1MB
            try:
                value = compress_image_in_memory(value)
            except Exception:
                raise serializers.ValidationError("Failed to process image. Please try a different file.")
        return value

    def validate_start_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Start time must be in the future")
        return value

    def validate_total_slots(self, value):
        if value < 2:
            raise serializers.ValidationError("Minimum 2 slots required")
        if value > 128:
            raise serializers.ValidationError("Maximum 128 slots allowed")
        # Ensure total_slots is a power of 2 for bracket generation
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


class TournamentParticipantSerializer(serializers.ModelSerializer):
    gamer = UserSerializer(read_only=True)
    tournament = TournamentSerializer(read_only=True)
    
    class Meta:
        model = TournamentParticipant
        fields = ['id', 'tournament', 'gamer', 'in_game_id', 'joined_at', 'payment_status', 
                 'payment_transaction_id', 'payment_amount', 'payment_proof', 'payment_note',
                 'approved_at', 'rejected_at', 'rejection_reason']
        read_only_fields = ['gamer', 'joined_at', 'payment_transaction_id', 'payment_amount', 
                          'approved_at', 'rejected_at', 'rejection_reason']


class TournamentParticipantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentParticipant
        fields = ['tournament']
    
    def validate_tournament(self, value):
        user = self.context['request'].user
        if not value.can_join(user):
            raise serializers.ValidationError("Cannot join this tournament")
        # Check if user has a Game ID in their profile
        try:
            profile = user.gamer_profile
            if not profile.in_game_id:
                raise serializers.ValidationError("You must have a Game ID in your profile to join a tournament. Please update your profile first.")
        except Exception:
            raise serializers.ValidationError("You must have a Gamer Profile with a Game ID to join a tournament.")
        return value


class TournamentMatchSerializer(serializers.ModelSerializer):
    participant1 = serializers.SerializerMethodField()
    participant2 = serializers.SerializerMethodField()
    winner = serializers.SerializerMethodField()
    
    class Meta:
        model = TournamentMatch
        fields = ['id', 'tournament', 'round', 'match_number', 'participant1', 
                 'participant2', 'score1', 'score2', 'winner', 'status', 
                 'scheduled_time', 'played_at']
        read_only_fields = ['tournament', 'match_number', 'status', 'played_at']
    
    def get_participant1(self, obj):
        return {
            'id': obj.participant1.id,
            'username': obj.participant1.gamer.username if obj.participant1 else None
        } if obj.participant1 else None
    
    def get_participant2(self, obj):
        return {
            'id': obj.participant2.id,
            'username': obj.participant2.gamer.username if obj.participant2 else None
        } if obj.participant2 else None
    
    def get_winner(self, obj):
        return {
            'id': obj.winner.id,
            'username': obj.winner.gamer.username if obj.winner else None
        } if obj.winner else None


class TournamentMatchUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentMatch
        fields = ['score1', 'score2', 'winner']
    
    def validate(self, data):
        match = self.instance
        if match.status == 'COMPLETED':
            raise serializers.ValidationError("Match is already completed")
        
        # Validate scores
        score1 = data.get('score1', 0)
        score2 = data.get('score2', 0)
        
        if score1 < 0 or score2 < 0:
            raise serializers.ValidationError("Scores cannot be negative")
        
        # If winner is provided, ensure it's one of the participants
        winner = data.get('winner')
        if winner:
            if winner != match.participant1 and winner != match.participant2:
                raise serializers.ValidationError("Winner must be one of the participants")
        
        return data


class TournamentListSerializer(serializers.ModelSerializer):
    slots_left = serializers.ReadOnlyField()
    registration_percentage = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    participants_count = serializers.SerializerMethodField()
    has_joined = serializers.SerializerMethodField()
    match_type = serializers.CharField(read_only=True)
    banner = serializers.SerializerMethodField()
    tournament_image = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ['id', 'title', 'game_name', 'match_type', 'description',
                 'entry_fee', 'prize_pool', 'start_time',
                 'total_slots', 'joined_slots', 'slots_available', 'slots_left',
                 'registration_percentage', 'is_full', 'is_active', 'status',
                 'created_at', 'participants_count',
                 'banner', 'tournament_image', 'has_joined']

    def get_participants_count(self, obj):
        return obj.participants.count()

    def get_has_joined(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participants.filter(gamer=request.user).exists()
        return False

    def _get_banner_url(self, obj):
        """Safely get banner URL, returning None if no file is set."""
        try:
            if obj.banner and hasattr(obj.banner, 'url'):
                return obj.banner.url
        except (ValueError, AttributeError):
            pass
        return None

    def get_banner(self, obj):
        return self._get_banner_url(obj)

    def get_tournament_image(self, obj):
        """Legacy alias for banner."""
        return self._get_banner_url(obj)


class TournamentJoinSerializer(serializers.Serializer):
    payment_gateway = serializers.ChoiceField(
        choices=['mock', 'shurjopay', 'sslcommerz', 'manual', 'installment'],
        default='mock'
    )
    in_game_id = serializers.CharField(required=False, max_length=100)
    
    def validate_payment_gateway(self, value):
        # Add validation for real payment gateways if needed
        return value
    
    def validate_in_game_id(self, value):
        request = self.context.get('request') if self.context else None
        user = request.user if request else None
        if user and user.is_authenticated:
            try:
                profile = user.gamer_profile
                if not profile.in_game_id:
                    raise serializers.ValidationError("You must have a Game ID in your profile to join a tournament.")
            except Exception:
                raise serializers.ValidationError("You must have a Gamer Profile with a Game ID to join a tournament.")
        return value


class TournamentPaymentSerializer(serializers.Serializer):
    transaction_id = serializers.CharField()
    
    def validate_transaction_id(self, value):
        if not value:
            raise serializers.ValidationError("Transaction ID is required")
        return value


class TournamentBracketSerializer(serializers.Serializer):
    tournament_id = serializers.IntegerField()
    bracket_structure = serializers.DictField(read_only=True)
    
    def validate_tournament_id(self, value):
        try:
            from .models import Tournament
            tournament = Tournament.objects.get(id=value)
            if not tournament.is_full:
                raise serializers.ValidationError("Tournament is not full yet")
            return value
        except Tournament.DoesNotExist:
            raise serializers.ValidationError("Tournament not found")


class TournamentStatsSerializer(serializers.Serializer):
    total_tournaments = serializers.IntegerField(read_only=True)
    active_tournaments = serializers.IntegerField(read_only=True)
    completed_tournaments = serializers.IntegerField(read_only=True)
    total_participants = serializers.IntegerField(read_only=True)
    total_prize_pool = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


# ══════════════════════════════════════════════════════════════════
# Manual Payment Registration Serializers
# ══════════════════════════════════════════════════════════════════

class TournamentRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a tournament registration with manual payment.
    Used when a user joins a paid tournament and submits payment details.
    """
    user = UserSerializer(read_only=True)
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)
    entry_fee = serializers.DecimalField(
        source='tournament.entry_fee', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = TournamentRegistration
        fields = [
            'id', 'tournament', 'tournament_title', 'user',
            'team_name', 'player_game_ids',
            'payment_method', 'sender_number', 'transaction_id',
            'payment_status', 'rejection_reason',
            'entry_fee', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'user', 'payment_status', 'rejection_reason', 'created_at', 'updated_at',
        ]

    def validate(self, data):
        """
        Validate the registration data.

        Key checks:
          1. Tournament must exist, be active, and have available slots.
          2. User must not already have a registration for this tournament
             (the model has unique_together=['tournament', 'user']).
          3. Payment method must be BKASH or ROCKET.
          4. Sender number must be at least 10 characters.
          5. Transaction ID must be at least 5 characters and unique.
          6. DUO/SQUAD tournaments require player_game_ids.
        """
        tournament = data.get('tournament')
        request = self.context.get('request')
        user = request.user if request else None

        # ── 1. Tournament checks ────────────────────────────────────
        if tournament:
            # Refresh from DB to avoid stale cached data
            tournament.refresh_from_db()

            if not tournament.is_active:
                raise serializers.ValidationError(
                    {'tournament': 'This tournament is not active.'}
                )
            if tournament.is_full:
                raise serializers.ValidationError(
                    {'tournament': 'This tournament is full. No slots available.'}
                )

            # ── 2. Duplicate registration check ──────────────────────
            if user:
                existing = TournamentRegistration.objects.filter(
                    tournament=tournament, user=user
                ).first()
                if existing:
                    if existing.payment_status == 'PENDING':
                        raise serializers.ValidationError(
                            {'tournament': 'You already have a pending registration for this tournament. '
                                          'Please wait for admin approval or contact support.'}
                        )
                    elif existing.payment_status == 'APPROVED':
                        raise serializers.ValidationError(
                            {'tournament': 'You are already approved for this tournament.'}
                        )
                    # REJECTED → allow re-registration, so we fall through

        # ── 3. Payment method ───────────────────────────────────────
        payment_method = data.get('payment_method')
        if payment_method not in ['BKASH', 'ROCKET']:
            raise serializers.ValidationError(
                {'payment_method': 'Invalid payment method. Choose BKASH or ROCKET.'}
            )

        # ── 4. Sender number ────────────────────────────────────────
        sender_number = (data.get('sender_number') or '').strip()
        if len(sender_number) < 10:
            raise serializers.ValidationError(
                {'sender_number': 'Please enter a valid mobile number (at least 10 digits).'}
            )
        if len(sender_number) > 15:
            raise serializers.ValidationError(
                {'sender_number': 'Mobile number is too long (max 15 characters).'}
            )

        # ── 5. Transaction ID ──────────────────────────────────────
        transaction_id = (data.get('transaction_id') or '').strip()
        if len(transaction_id) < 5:
            raise serializers.ValidationError(
                {'transaction_id': 'Please enter a valid Transaction ID (at least 5 characters).'}
            )
        # Check uniqueness (model has unique=True, but we give a clear error)
        if TournamentRegistration.objects.filter(transaction_id=transaction_id).exists():
            raise serializers.ValidationError(
                {'transaction_id': 'This Transaction ID has already been used. Please enter a unique TxID.'}
            )

        # ── 6. Player game IDs for DUO/SQUAD ───────────────────────
        if tournament and tournament.match_type in ['DUO', 'SQUAD']:
            player_game_ids = data.get('player_game_ids')
            if not player_game_ids:
                raise serializers.ValidationError(
                    {'player_game_ids': f'{tournament.match_type} tournaments require player details for all teammates.'}
                )

        return data


class TournamentRegistrationAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admin to view and manage pending registrations.
    """
    user = UserSerializer(read_only=True)
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)
    game_name = serializers.CharField(source='tournament.game_name', read_only=True)
    match_type = serializers.CharField(source='tournament.match_type', read_only=True)
    entry_fee = serializers.DecimalField(
        source='tournament.entry_fee', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = TournamentRegistration
        fields = [
            'id', 'tournament', 'tournament_title', 'game_name', 'match_type',
            'user', 'team_name', 'player_game_ids',
            'payment_method', 'sender_number', 'transaction_id',
            'payment_status', 'reviewed_by', 'rejection_reason',
            'entry_fee', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']