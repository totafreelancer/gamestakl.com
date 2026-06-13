from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserManagementViewSet, basename='admin-users')
router.register(r'content', views.ContentManagementViewSet, basename='admin-content')
router.register(r'tournaments', views.TournamentManagementViewSet, basename='admin-tournaments')

urlpatterns = [
    path('stats/', views.DashboardStatsView.as_view(), name='admin-stats'),
    path('activity/', views.RecentActivityView.as_view(), name='admin-activity'),
    path('', include(router.urls)),
]
