"""
Custom DRF permission classes for role-based access control.
"""
from rest_framework import permissions
from .models import Project, ProjectRole


class IsProjectMember(permissions.BasePermission):
    """
    Check if user is a member of the project.
    """
    def has_object_permission(self, request, view, obj):
        # obj is either a Project or Task
        if isinstance(obj, Project):
            project = obj
        else:
            project = obj.project
        
        return ProjectRole.objects.filter(user=request.user, project=project).exists()


class IsProjectOwner(permissions.BasePermission):
    """
    Check if user is the owner of the project.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project):
            project = obj
        else:
            project = obj.project
        
        try:
            role = ProjectRole.objects.get(user=request.user, project=project)
            return role.role == ProjectRole.OWNER
        except ProjectRole.DoesNotExist:
            return False


class IsProjectOwnerOrAdmin(permissions.BasePermission):
    """
    Check if user is owner or admin of the project.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project):
            project = obj
        else:
            project = obj.project
        
        try:
            role = ProjectRole.objects.get(user=request.user, project=project)
            return role.role in [ProjectRole.OWNER, ProjectRole.ADMIN]
        except ProjectRole.DoesNotExist:
            return False


class IsProjectOwnerAdminOrModerator(permissions.BasePermission):
    """
    Check if user is owner, admin, or moderator of the project.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project):
            project = obj
        else:
            project = obj.project
        
        try:
            role = ProjectRole.objects.get(user=request.user, project=project)
            return role.role in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]
        except ProjectRole.DoesNotExist:
            return False


class IsProjectOwnerOrReadOnly(permissions.BasePermission):
    """
    Owner can edit, everyone else can only read.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project):
            project = obj
        else:
            project = obj.project
        
        if request.method in permissions.SAFE_METHODS:
            return ProjectRole.objects.filter(user=request.user, project=project).exists()
        
        try:
            role = ProjectRole.objects.get(user=request.user, project=project)
            return role.role == ProjectRole.OWNER
        except ProjectRole.DoesNotExist:
            return False


class CanAssignProjectRoles(permissions.BasePermission):
    """
    Only Owner and Admin can assign roles, but:
    - Owner can assign any role (including owner)
    - Admin cannot assign owner role
    """
    def has_object_permission(self, request, view, obj):
        try:
            user_role = ProjectRole.objects.get(user=request.user, project=obj)
            
            # Owner can assign any role
            if user_role.role == ProjectRole.OWNER:
                return True
            
            # Admin can assign roles except owner
            if user_role.role == ProjectRole.ADMIN:
                # Check if trying to assign owner role
                target_role = request.data.get('role')
                return target_role != ProjectRole.OWNER
            
            return False
        except ProjectRole.DoesNotExist:
            return False


class CanManageTasks(permissions.BasePermission):
    """
    Moderators, Admins, and Owners can manage tasks.
    Members can only view.
    """
    def has_object_permission(self, request, view, obj):
        # obj is a Task
        project = obj.project
        
        if request.method in permissions.SAFE_METHODS:
            # Everyone in project can view
            return ProjectRole.objects.filter(user=request.user, project=project).exists()
        
        # Need to be moderator or higher to modify
        try:
            role = ProjectRole.objects.get(user=request.user, project=project)
            return role.role in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]
        except ProjectRole.DoesNotExist:
            return False
