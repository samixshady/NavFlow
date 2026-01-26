from django.contrib import admin
from .models import Organization, Membership


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_owner', 'member_count', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    def member_count(self, obj):
        """Display member count in admin."""
        return obj.memberships.count()
    member_count.short_description = 'Members'
    
    def get_owner(self, obj):
        """Display owner email in admin."""
        owner = obj.get_owner()
        return owner.user.email if owner else 'N/A'
    get_owner.short_description = 'Owner'


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'organization', 'role', 'joined_at']
    list_filter = ['role', 'organization', 'joined_at']
    search_fields = ['user__email', 'organization__name']
    readonly_fields = ['joined_at']
    
    def user_email(self, obj):
        """Display user email in admin."""
        return obj.user.email
    user_email.short_description = 'User'
