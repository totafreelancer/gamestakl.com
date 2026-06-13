from django.urls import path
from . import views
from . import firebase_views

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('password-reset-request/', views.password_reset_request, name='password-reset-request'),
    path('password-reset-confirm/', views.password_reset_confirm, name='password-reset-confirm'),
    path('stats/', views.user_stats, name='user-stats'),
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Firebase endpoints
    path('firebase/login/', firebase_views.firebase_login, name='firebase-login'),
    path('firebase/test/', firebase_views.firebase_test, name='firebase-test'),
]