from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# ── Router for ViewSets ──────────────────────────────────────────
router = DefaultRouter()
router.register(r'registrations', views.TournamentRegistrationViewSet, basename='tournament-registration')

urlpatterns = [
    # ── Tournament CRUD ───────────────────────────────────────────
    path('', views.TournamentListCreateView.as_view(), name='tournament-list-create'),
    path('<int:pk>/', views.TournamentDetailView.as_view(), name='tournament-detail'),

    # ── Manual Payment Registration ──────────────────────────────
    path('<int:pk>/register/', views.register_for_tournament, name='register-for-tournament'),
    path('<int:pk>/my-status/', views.get_my_registration_status, name='my-registration-status'),

    # ── Admin: Manage Registrations ───────────────────────────────
    path('admin/registrations/pending/', views.admin_list_pending_registrations,
         name='admin-pending-registrations'),
    path('admin/registrations/<int:registration_id>/approve/',
         views.admin_approve_registration, name='admin-approve-registration'),
    path('admin/registrations/<int:registration_id>/reject/',
         views.admin_reject_registration, name='admin-reject-registration'),

    # ── Legacy Payment Flow (kept for backward compatibility) ────
    path('<int:pk>/join/', views.join_tournament, name='join-tournament'),
    path('participants/<int:pk>/verify-payment/', views.verify_payment, name='verify-payment'),
    path('participants/<int:pk>/submit-payment-proof/', views.submit_manual_payment_proof, name='submit-manual-payment-proof'),
    path('participants/<int:pk>/payment-status/', views.get_manual_payment_status, name='get-manual-payment-status'),
    path('participants/<int:pk>/approve-payment/', views.approve_manual_payment, name='approve-manual-payment'),
    path('participants/<int:pk>/reject-payment/', views.reject_manual_payment, name='reject-manual-payment'),
    path('participants/pending-payments/', views.get_pending_manual_payments, name='get-pending-manual-payments'),

    # ── Participants ──────────────────────────────────────────────
    path('participants/', views.TournamentParticipantListView.as_view(), name='participant-list'),
    path('participants/<int:pk>/', views.TournamentParticipantDetailView.as_view(), name='participant-detail'),

    # ── Matches ───────────────────────────────────────────────────
    path('matches/', views.TournamentMatchListView.as_view(), name='match-list'),
    path('matches/<int:pk>/', views.TournamentMatchDetailView.as_view(), name='match-detail'),
    path('matches/<int:pk>/score/', views.update_match_score, name='update-match-score'),

    # ── Brackets ──────────────────────────────────────────────────
    path('<int:pk>/bracket/generate/', views.generate_bracket, name='generate-bracket'),
    path('<int:pk>/bracket/', views.get_bracket, name='get-bracket'),

    # ── Stats & Utilities ─────────────────────────────────────────
    path('stats/', views.tournament_stats, name='tournament-stats'),
    path('upcoming/', views.upcoming_tournaments, name='upcoming-tournaments'),

    # ── ViewSet Routes (must be last to avoid conflicts) ──────────
    path('', include(router.urls)),
]