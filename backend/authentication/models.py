from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    date_joined = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    firebase_uid = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.username


class GamerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='gamer_profile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    in_game_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    points = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vip_status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.in_game_id or 'No Game ID'}"
    
    @property
    def total_posts(self):
        return self.user.forum_posts.count()
    
    @property
    def total_comments(self):
        return self.user.comments.count()
    
    @property
    def tournaments_won(self):
        return self.user.tournament_participations.filter(
            tournament__is_active=True,
            payment_status='Paid'
        ).count()

    @property
    def followers_count(self):
        return self.user.followers.count()

    @property
    def following_count(self):
        return self.user.following.count()


class Follower(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class PersonalMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pm_sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pm_received_messages')
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='message_images/', blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.sender.username} to {self.receiver.username}"