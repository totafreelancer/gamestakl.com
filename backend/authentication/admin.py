from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, GamerProfile


class GamerProfileInline(admin.StackedInline):
    model = GamerProfile
    can_delete = False
    verbose_name_plural = 'Gamer Profile'


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_active', 'date_joined')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )
    
    inlines = (GamerProfileInline,)


@admin.register(GamerProfile)
class GamerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'in_game_id', 'points', 'vip_status', 'created_at')
    list_filter = ('vip_status', 'created_at')
    search_fields = ('user__username', 'user__email', 'in_game_id')
    ordering = ('-points',)
