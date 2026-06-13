from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator

User = get_user_model()


class Tournament(models.Model):
    """
    Tournament model representing a gaming tournament.
    Supports Free Fire and PUBG with Solo, Duo, and Squad match types.
    """
    # ── Game Choices ──────────────────────────────────────────────
    GAME_CHOICES = [
        ('FREE_FIRE', 'Free Fire'),
        ('PUBG', 'PUBG'),
    ]

    # ── Match Type Choices ────────────────────────────────────────
    MATCH_TYPE_CHOICES = [
        ('SOLO', 'Solo'),
        ('DUO', 'Duo'),
        ('SQUAD', 'Squad'),
    ]

    # ── Status Choices ────────────────────────────────────────────
    STATUS_CHOICES = [
        ('UPCOMING', 'Upcoming'),
        ('REGISTRATION_OPEN', 'Registration Open'),
        ('REGISTRATION_CLOSED', 'Registration Closed'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    # ── Core Fields ───────────────────────────────────────────────
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_tournaments'
    )
    game_name = models.CharField(max_length=50, choices=GAME_CHOICES)
    match_type = models.CharField(
        max_length=20, choices=MATCH_TYPE_CHOICES, default='SOLO',
        help_text="Tournament match type: Solo, Duo, or Squad"
    )
    description = models.TextField()

    # ── Media ─────────────────────────────────────────────────────
    banner = models.ImageField(
        upload_to='tournament_images/', blank=True, null=True,
        help_text="Tournament banner image"
    )

    # ── Financial ─────────────────────────────────────────────────
    entry_fee = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    prize_pool = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )

    # ── Scheduling ────────────────────────────────────────────────
    start_time = models.DateTimeField()

    # ── Slots ─────────────────────────────────────────────────────
    total_slots = models.IntegerField(
        default=16, validators=[MinValueValidator(2)],
        help_text="Total available slots"
    )
    joined_slots = models.IntegerField(
        default=0,
        help_text="Number of slots already filled"
    )

    # ── Room Details (visible after approval) ─────────────────────
    room_id = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Tournament room ID – revealed after payment approval"
    )
    room_password = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Tournament room password – revealed after payment approval"
    )

    # ── Status & Flags ────────────────────────────────────────────
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='UPCOMING'
    )

    # ── Timestamps ────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Extra ─────────────────────────────────────────────────────
    rules = models.TextField(blank=True)

    # ── Legacy aliases (keep old serializers working) ─────────────
    @property
    def slots_available(self):
        return self.total_slots

    @property
    def slots_filled(self):
        return self.joined_slots

    @property
    def tournament_image(self):
        return self.banner

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_game_name_display()} ({self.get_match_type_display()})"

    # ── Computed Properties ───────────────────────────────────────
    @property
    def slots_left(self):
        return self.total_slots - self.joined_slots

    @property
    def is_full(self):
        return self.joined_slots >= self.total_slots

    @property
    def registration_percentage(self):
        if self.total_slots == 0:
            return 0
        return (self.joined_slots / self.total_slots) * 100

    # ── Helpers ───────────────────────────────────────────────────
    def update_status(self):
        if self.joined_slots >= self.total_slots:
            self.status = 'REGISTRATION_CLOSED'
        elif timezone.now() >= self.start_time:
            self.status = 'ONGOING'
        elif timezone.now().date() == self.start_time.date():
            self.status = 'REGISTRATION_OPEN'
        else:
            self.status = 'UPCOMING'
        self.save()

    def can_join(self, user):
        if not self.is_active:
            return False
        if self.is_full:
            return False
        if TournamentRegistration.objects.filter(tournament=self, user=user).exists():
            return False
        if TournamentParticipant.objects.filter(tournament=self, gamer=user).exists():
            return False
        return True


class TournamentRegistration(models.Model):
    """
    Handles manual payment tournament registrations.
    Users submit their payment details (bKash / Rocket) and
    admins approve or reject the registration.
    """
    PAYMENT_METHOD_CHOICES = [
        ('BKASH', 'bKash'),
        ('ROCKET', 'Rocket'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    # ── Relationships ─────────────────────────────────────────────
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='registrations'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='tournament_registrations'
    )

    # ── Team / Player Info ────────────────────────────────────────
    team_name = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Optional team name for Duo/Squad tournaments"
    )
    player_game_ids = models.JSONField(
        blank=True, null=True,
        help_text="JSON mapping of player IGNs and Game UIDs"
    )

    # ── Payment Details ───────────────────────────────────────────
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES
    )
    sender_number = models.CharField(
        max_length=15,
        help_text="User's bKash/Rocket number used for payment"
    )
    transaction_id = models.CharField(
        max_length=100, unique=True,
        help_text="Transaction ID (TxID) from the payment – must be unique"
    )

    # ── Approval Workflow ─────────────────────────────────────────
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING'
    )
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_registrations'
    )
    rejection_reason = models.TextField(blank=True, null=True)

    # ── Timestamps ────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['tournament', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.tournament.title} [{self.payment_status}]"

    def approve(self, admin_user):
        """Approve this registration and create a TournamentParticipant."""
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            self.payment_status = 'APPROVED'
            self.reviewed_by = admin_user
            self.save()

            # Create the legacy TournamentParticipant for backward compat.
            participant, created = TournamentParticipant.objects.get_or_create(
                tournament=self.tournament,
                gamer=self.user,
                defaults={
                    'in_game_id': self._extract_in_game_id(),
                    'payment_status': 'PAID',
                    'payment_transaction_id': f'MANUAL_{self.transaction_id}',
                    'payment_amount': self.tournament.entry_fee,
                }
            )

            # Update tournament slot count
            tournament = Tournament.objects.select_for_update().get(pk=self.tournament.pk)
            tournament.joined_slots = models.F('joined_slots') + 1
            tournament.save()
            tournament.refresh_from_db()
            tournament.update_status()

        return participant

    def reject(self, admin_user, reason=''):
        """Reject this registration."""
        self.payment_status = 'REJECTED'
        self.reviewed_by = admin_user
        self.rejection_reason = reason
        self.save()

    def _extract_in_game_id(self):
        """Extract in_game_id string from player_game_ids JSON."""
        if isinstance(self.player_game_ids, dict):
            parts = []
            for key, val in self.player_game_ids.items():
                if isinstance(val, dict):
                    ign = val.get('ign', '')
                    uid = val.get('uid', '')
                    parts.append(f"{ign}#{uid}" if ign and uid else ign or uid)
                elif isinstance(val, str):
                    parts.append(val)
            return ', '.join(parts)
        elif isinstance(self.player_game_ids, str):
            return self.player_game_ids
        return ''


class TournamentParticipant(models.Model):
    """
    Legacy participant model – kept for backward compatibility.
    New registrations go through TournamentRegistration first.
    """
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PENDING_ADMIN_APPROVAL', 'Pending Admin Approval'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    gamer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournament_participations')
    in_game_id = models.CharField(max_length=100, blank=True, default='')
    joined_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payment_proof = models.ImageField(upload_to='payment_proofs/', blank=True, null=True)
    payment_note = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['tournament', 'gamer']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.gamer.username} - {self.tournament.title}"

    def process_payment(self, transaction_id, amount):
        self.payment_status = 'PAID'
        self.payment_transaction_id = transaction_id
        self.payment_amount = amount
        self.save()

        tournament = self.tournament
        tournament.update_status()

        try:
            gamer_profile = self.gamer.gamer_profile
            gamer_profile.points += 10
            gamer_profile.save()
        except Exception:
            pass


class TournamentMatch(models.Model):
    ROUND_CHOICES = [
        ('ROUND_OF_16', 'Round of 16'),
        ('QUARTER_FINAL', 'Quarter Final'),
        ('SEMI_FINAL', 'Semi Final'),
        ('FINAL', 'Final'),
    ]

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    round = models.CharField(max_length=20, choices=ROUND_CHOICES)
    match_number = models.IntegerField()
    participant1 = models.ForeignKey(TournamentParticipant, on_delete=models.CASCADE, related_name='matches_as_player1', null=True, blank=True)
    participant2 = models.ForeignKey(TournamentParticipant, on_delete=models.CASCADE, related_name='matches_as_player2', null=True, blank=True)
    score1 = models.IntegerField(default=0)
    score2 = models.IntegerField(default=0)
    winner = models.ForeignKey(TournamentParticipant, on_delete=models.CASCADE, related_name='matches_won', null=True, blank=True)
    status = models.CharField(max_length=20, default='PENDING')
    scheduled_time = models.DateTimeField(null=True, blank=True)
    played_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['match_number']

    def __str__(self):
        return f"Match {self.match_number} - {self.round} - {self.tournament.title}"

    def set_winner(self, winner):
        self.winner = winner
        self.status = 'COMPLETED'
        self.played_at = timezone.now()
        self.save()

        if self.round == 'FINAL':
            tournament = self.tournament
            tournament.status = 'COMPLETED'
            tournament.save()

            prize_amount = tournament.prize_pool
            if winner:
                gamer_profile = winner.gamer.gamer_profile
                gamer_profile.points += int(prize_amount)
                gamer_profile.save()