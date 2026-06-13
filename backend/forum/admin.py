from django.contrib import admin
from .models import ForumPost, Comment


@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ('content_preview', 'author', 'category', 'created_at', 'upvote_count', 'comment_count', 'is_flagged')
    list_filter = ('category', 'is_flagged', 'created_at')
    search_fields = ('content', 'author__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    def upvote_count(self, obj):
        return obj.upvotes.count()
    
    def content_preview(self, obj):
        return obj.content[:80] + '...' if len(obj.content) > 80 else obj.content or '(Image post)'
    content_preview.short_description = 'Content'

    def comment_count(self, obj):
        return obj.comments.count()


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at', 'upvote_count', 'is_flagged', 'is_reply')
    list_filter = ('is_flagged', 'created_at')
    search_fields = ('content', 'author__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    def upvote_count(self, obj):
        return obj.upvotes.count()
    
    def is_reply(self, obj):
        return obj.parent_comment is not None
    is_reply.boolean = True
