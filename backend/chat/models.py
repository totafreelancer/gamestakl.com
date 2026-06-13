from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Conversation(models.Model):
    """
    Represents a conversation — either 1-on-1 (private) or group chat.
    - is_group=False: Direct message between two users
    - is_group=True: Group chat with multiple participants, name, admin, avatar
    """
    CONVERSATION_TYPE_CHOICES = [
        ('private', 'Private'),
        ('group', 'Group'),
    ]

    name = models.CharField(max_length=255, blank=True, default='')
    conversation_type = models.CharField(
        max_length=10,
        choices=CONVERSATION_TYPE_CHOICES,
        default='private',
    )
    admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='administered_conversations'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_conversations'
    )
    avatar = models.ImageField(
        upload_to='group_avatars/',
        blank=True,
        null=True
    )
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        if self.is_group:
            return f"Group({self.name})"
        usernames = ', '.join(self.participants.values_list('username', flat=True))
        return f"DM({usernames})"

    @property
    def is_group(self):
        return self.conversation_type == 'group'

    @classmethod
    def get_or_create_dm(cls, user1, user2):
        """Get or create a 1-on-1 conversation between two users."""
        conversation = cls.objects.filter(
            conversation_type='private'
        ).filter(
            participants=user1
        ).filter(
            participants=user2
        ).first()

        if not conversation:
            conversation = cls.objects.create(
                conversation_type='private',
                created_by=user1,
            )
            conversation.participants.add(user1, user2)

        return conversation

    def get_other_participant(self, user):
        """Return the other participant in a 1-on-1 conversation."""
        if self.is_group:
            return None
        return self.participants.exclude(id=user.id).first()

    def get_display_name(self, user):
        """Return the display name for this conversation relative to the given user."""
        if self.is_group:
            return self.name or 'Unnamed Group'
        other = self.get_other_participant(user)
        return other.username if other else 'Unknown'

    def get_display_avatar(self, user):
        """Return the avatar URL for this conversation relative to the given user."""
        if self.is_group and self.avatar:
            return self.avatar.url
        other = self.get_other_participant(user)
        if other and hasattr(other, 'gamer_profile') and other.gamer_profile.profile_picture:
            return other.gamer_profile.profile_picture.url
        return None

    def get_last_message(self):
        """Return the last message in this conversation."""
        return self.messages.order_by('-timestamp').first()

    def get_unread_count(self, user):
        """Return the count of unread messages for a specific user."""
        return self.messages.filter(is_seen=False).exclude(sender=user).count()


class Message(models.Model):
    """
    Represents a single message within a conversation.
    Supports text content, image attachments, and file attachments.

    message_type determines how the frontend renders the message:
      - 'TEXT'  → plain text bubble
      - 'IMAGE' → image with optional caption text
      - 'FILE'  → generic file attachment (future-proofing)
    """
    MESSAGE_TYPE_CHOICES = [
        ('TEXT', 'Text'),
        ('IMAGE', 'Image'),
        ('FILE', 'File'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_chat_messages'
    )
    text = models.TextField(blank=True, default='')
    image = models.ImageField(
        upload_to='message_images/',
        blank=True,
        null=True,
        help_text="Image attachment — used when message_type is 'IMAGE'"
    )
    file_attachment = models.FileField(
        upload_to='message_files/',
        blank=True,
        null=True,
        help_text="Generic file attachment — used when message_type is 'FILE'"
    )
    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPE_CHOICES,
        default='TEXT',
        help_text="Determines how the frontend renders this message"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    is_seen = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        if self.message_type == 'IMAGE':
            return f"{self.sender.username}: [Image]"
        return f"{self.sender.username}: {self.text[:50]}"

    @property
    def image_url(self):
        """Return the full URL for the image field, or None."""
        if self.image:
            return self.image.url
        return None

    @property
    def file_url(self):
        """Return the URL for whichever attachment is present."""
        if self.image:
            return self.image.url
        if self.file_attachment:
            return self.file_attachment.url
        return None


class CallSession(models.Model):
    """
    Represents an audio/video call session between users.
    Used for signaling via WebSockets — actual media flows through WebRTC.
    """
    CALL_TYPE_CHOICES = [
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]
    CALL_STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('ringing', 'Ringing'),
        ('connected', 'Connected'),
        ('declined', 'Declined'),
        ('missed', 'Missed'),
        ('ended', 'Ended'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='call_sessions'
    )
    caller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='calls_made'
    )
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='calls_received'
    )
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='audio')
    status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='initiated')
    session_id = models.CharField(max_length=255, unique=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.call_type} call from {self.caller} to {self.receiver} ({self.status})"
