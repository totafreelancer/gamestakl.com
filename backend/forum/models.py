from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class ForumPost(models.Model):
    CATEGORY_CHOICES = [
        ('PC', 'PC Gaming'),
        ('MOBILE', 'Mobile Gaming'),
        ('NEWS', 'Gaming News'),
        ('GENERAL', 'General Discussion'),
    ]
    
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_posts')
    content = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    upvotes = models.ManyToManyField(User, related_name='upvoted_posts', blank=True)
    is_flagged = models.BooleanField(default=False)
    flagged_reason = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        preview = self.content[:50] if self.content else 'Image post'
        return f"{preview} by {self.author.username}"
    
    @property
    def upvote_count(self):
        return self.upvotes.count()
    
    @property
    def comment_count(self):
        return self.comments.count()
    
    def upvote(self, user):
        if user not in self.upvotes.all():
            self.upvotes.add(user)
            return True
        return False
    
    def remove_upvote(self, user):
        if user in self.upvotes.all():
            self.upvotes.remove(user)
            return True
        return False


class Comment(models.Model):
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    upvotes = models.ManyToManyField(User, related_name='upvoted_comments', blank=True)
    is_flagged = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"
    
    @property
    def upvote_count(self):
        return self.upvotes.count()
    
    @property
    def is_reply(self):
        return self.parent_comment is not None
    
    def upvote(self, user):
        if user not in self.upvotes.all():
            self.upvotes.add(user)
            return True
        return False
    
    def remove_upvote(self, user):
        if user in self.upvotes.all():
            self.upvotes.remove(user)
            return True
        return False