from django.urls import path
from . import views

urlpatterns = [
    # Conversation list & detail
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),

    # Group chat endpoints
    path('conversations/group/create/', views.create_group, name='create-group'),
    path('conversations/group/<int:conversation_id>/add/', views.add_group_members, name='add-group-members'),
    path('conversations/group/<int:conversation_id>/remove/<int:user_id>/', views.remove_group_member, name='remove-group-member'),
    path('conversations/group/<int:conversation_id>/leave/', views.leave_group, name='leave-group'),
    path('conversations/group/<int:conversation_id>/update/', views.update_group, name='update-group'),

    # DM endpoints
    path('conversations/dm/<int:user_id>/', views.get_or_create_dm, name='get-or-create-dm'),

    # Message endpoints (shared between DM and group)
    path('conversations/<int:conversation_id>/messages/', views.MessageListView.as_view(), name='message-list'),
    path('conversations/<int:conversation_id>/send/', views.send_message, name='send-message'),
    path('conversations/<int:conversation_id>/seen/', views.mark_conversation_seen, name='mark-seen'),
    path('conversations/unread-count/', views.unread_count, name='unread-count'),

    # Image upload endpoint — returns URL for WebSocket broadcast
    path('messages/upload-image/', views.upload_message_image, name='upload-message-image'),
]
