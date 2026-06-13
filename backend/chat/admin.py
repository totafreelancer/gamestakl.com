from django.contrib import admin
from .models import Conversation, Message, CallSession


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('timestamp',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'conversation_type', 'admin', 'participant_count', 'created_at', 'updated_at')
    list_filter = ('conversation_type', 'created_at', 'updated_at')
    filter_horizontal = ('participants',)
    inlines = [MessageInline]

    def participant_count(self, obj):
        return obj.participants.count()
    participant_count.short_description = 'Members'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'conversation', 'text_preview', 'timestamp', 'is_seen')
    list_filter = ('is_seen', 'timestamp', 'conversation__conversation_type')
    search_fields = ('text', 'sender__username')
    readonly_fields = ('timestamp',)

    def text_preview(self, obj):
        return obj.text[:50] if obj.text else '(attachment)'
    text_preview.short_description = 'Message'


@admin.register(CallSession)
class CallSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'caller', 'receiver', 'call_type', 'status', 'started_at')
    list_filter = ('call_type', 'status', 'started_at')
    search_fields = ('caller__username', 'receiver__username', 'session_id')
    readonly_fields = ('session_id', 'started_at')
