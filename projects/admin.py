from django.contrib import admin
from .models import Project, ProjectRole, Task, AuditLog


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'get_owner', 'member_count', 'status', 'created_at']
    list_filter = ['status', 'organization', 'created_at']
    search_fields = ['name', 'organization__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    def member_count(self, obj):
        return obj.roles.count()
    member_count.short_description = 'Members'
    
    def get_owner(self, obj):
        owner = obj.get_owner()
        return owner.user.email if owner else 'N/A'
    get_owner.short_description = 'Owner'


@admin.register(ProjectRole)
class ProjectRoleAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'project', 'role', 'assigned_at']
    list_filter = ['role', 'project', 'assigned_at']
    search_fields = ['user__email', 'project__name']
    readonly_fields = ['assigned_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'assigned_to_email', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'project', 'created_at']
    search_fields = ['title', 'project__name', 'assigned_to__email']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'deleted_at']
    
    def assigned_to_email(self, obj):
        return obj.assigned_to.email if obj.assigned_to else 'N/A'
    assigned_to_email.short_description = 'Assigned To'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Phase 5: Admin interface for audit logs."""
    list_display = ['user_email', 'action', 'content_type', 'object_name', 'timestamp']
    list_filter = ['action', 'content_type', 'organization', 'timestamp']
    search_fields = ['user__email', 'object_name']
    readonly_fields = ['organization', 'user', 'action', 'content_type', 'object_id', 'object_name', 'changes', 'timestamp']
    
    def user_email(self, obj):
        return obj.user.email if obj.user else 'System'
    user_email.short_description = 'User'
