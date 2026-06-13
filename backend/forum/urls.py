from django.urls import path
from . import views

urlpatterns = [
    path('posts/', views.ForumPostListCreateView.as_view(), name='post-list-create'),
    path('posts/<int:pk>/', views.ForumPostDetailView.as_view(), name='post-detail'),
    path('posts/<int:pk>/upvote/', views.post_upvote, name='post-upvote'),
    path('comments/', views.CommentListCreateView.as_view(), name='comment-list-create'),
    path('comments/<int:pk>/', views.CommentDetailView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/upvote/', views.comment_upvote, name='comment-upvote'),
    path('stats/', views.forum_stats, name='forum-stats'),
]