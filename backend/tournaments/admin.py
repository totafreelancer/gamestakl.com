from django.contrib import admin
from .models import Tournament, TournamentParticipant, TournamentMatch


class TournamentParticipantInline(admin.TabularInline):
    model = TournamentParticipant
    extra = 0
    readonly_fields = ('joined_at',)


class TournamentMatchInline(admin.TabularInline):
    model = TournamentMatch
    extra = 0
    readonly_fields = ('match_number',)


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('title', 'game_name', 'entry_fee', 'prize_pool', 'start_time', 'slots_filled', 'slots_available', 'status', 'is_active')
    list_filter = ('game_name', 'status', 'is_active', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'slots_filled')
    inlines = [TournamentParticipantInline, TournamentMatchInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'game_name', 'description', 'rules')
        }),
        ('Financial', {
            'fields': ('entry_fee', 'prize_pool')
        }),
        ('Schedule & Slots', {
            'fields': ('start_time', 'slots_available', 'slots_filled')
        }),
        ('Status', {
            'fields': ('is_active', 'status')
        }),
        ('Media', {
            'fields': ('tournament_image',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TournamentParticipant)
class TournamentParticipantAdmin(admin.ModelAdmin):
    list_display = ('gamer', 'tournament', 'joined_at', 'payment_status', 'payment_amount')
    list_filter = ('payment_status', 'joined_at')
    search_fields = ('gamer__username', 'gamer__email', 'tournament__title')
    ordering = ('-joined_at',)
    readonly_fields = ('joined_at',)


@admin.register(TournamentMatch)
class TournamentMatchAdmin(admin.ModelAdmin):
    list_display = ('match_number', 'tournament', 'round', 'participant1', 'participant2', 'winner', 'status')
    list_filter = ('round', 'status', 'tournament')
    search_fields = ('tournament__title',)
    ordering = ('match_number',)
