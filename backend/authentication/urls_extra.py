from django.urls import path
from . import views_extra as views

urlpatterns = [
    # User Profile
    path('users/<int:user_id>/profile/', views.get_user_profile, name='get-user-profile'),

    # Follow / Unfollow
    path('users/<int:user_id>/follow/', views.follow_user, name='follow-user'),
    path('users/<int:user_id>/unfollow/', views.unfollow_user, name='unfollow-user'),
    path('users/<int:user_id>/followers/', views.get_followers, name='get-followers'),
    path('users/<int:user_id>/following/', views.get_following, name='get-following'),
    path('users/<int:user_id>/follow-status/', views.check_follow_status, name='check-follow-status'),

    # User Search (for messaging)
    path('users/search/', views.search_users, name='search-users'),

    # Personal Messaging
    path('messages/send/', views.send_message, name='send-message'),
    path('messages/inbox/', views.get_inbox, name='get-inbox'),
    path('messages/unread-count/', views.get_unread_count, name='unread-count'),
    path('messages/conversation/<int:user_id>/', views.get_conversation, name='get-conversation'),
    path('messages/<int:message_id>/delete/', views.delete_message, name='delete-message'),
]
