"""
Phase 4: Service layer for business logic and validation.
Encapsulates complex operations and rules in one place.
"""
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Task, Project, ProjectRole, AuditLog
from orgs.models import Organization


class TaskService:
    """Phase 4: Handle all task-related business logic."""
    
    @staticmethod
    def can_create_task(user, project):
        """Check if user can create tasks in project (moderator+)."""
        role = ProjectRole.objects.filter(user=user, project=project).first()
        if not role:
            raise ValidationError("User is not a member of this project.")
        
        allowed_roles = [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]
        if role.role not in allowed_roles:
            raise ValidationError(f"Only moderators and above can create tasks. You are a {role.get_role_display()}.")
        return True
    
    @staticmethod
    def can_update_task(user, task):
        """Check if user can update task (moderator+ or creator)."""
        role = ProjectRole.objects.filter(user=user, project=task.project).first()
        if not role:
            raise ValidationError("You are not a member of this project.")
        
        allowed_roles = [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]
        if role.role not in allowed_roles:
            raise ValidationError("Only moderators and above can update tasks.")
        return True
    
    @staticmethod
    def can_assign_task(user, project):
        """Check if user can assign tasks (any project member can view assigned users)."""
        return ProjectRole.objects.filter(user=user, project=project).exists()
    
    @staticmethod
    def create_task(user, project, title, description, priority, status, assigned_to=None, due_date=None):
        """Phase 4: Create task with validation and audit logging."""
        # Validate permissions
        TaskService.can_create_task(user, project)
        
        # Create task
        task = Task.objects.create(
            project=project,
            title=title,
            description=description,
            priority=priority,
            status=status,
            assigned_to=assigned_to,
            due_date=due_date,
            created_by=user
        )
        
        # Phase 5: Log action
        AuditLog.objects.create(
            organization=project.organization,
            user=user,
            action=AuditLog.ACTION_CREATE,
            content_type='task',
            object_id=task.id,
            object_name=task.title,
            changes={'title': title, 'priority': priority, 'status': status}
        )
        
        return task
    
    @staticmethod
    def update_task(user, task, **fields):
        """Phase 4: Update task with audit logging."""
        # Validate permissions
        TaskService.can_update_task(user, task)
        
        # Track changes
        changes = {}
        for field, value in fields.items():
            if hasattr(task, field) and getattr(task, field) != value:
                changes[field] = [str(getattr(task, field)), str(value)]
            setattr(task, field, value)
        
        task.save()
        
        # Phase 5: Log changes
        if changes:
            AuditLog.objects.create(
                organization=task.project.organization,
                user=user,
                action=AuditLog.ACTION_UPDATE,
                content_type='task',
                object_id=task.id,
                object_name=task.title,
                changes=changes
            )
        
        return task
    
    @staticmethod
    def delete_task(user, task):
        """Phase 4: Soft delete task with audit logging."""
        # Validate permissions (same as update)
        TaskService.can_update_task(user, task)
        
        # Soft delete
        task.soft_delete()
        
        # Phase 5: Log deletion
        AuditLog.objects.create(
            organization=task.project.organization,
            user=user,
            action=AuditLog.ACTION_DELETE,
            content_type='task',
            object_id=task.id,
            object_name=task.title,
            changes={'deleted_at': [None, timezone.now().isoformat()]}
        )
        
        return task


class ProjectService:
    """Phase 5: Handle project-related business logic."""
    
    @staticmethod
    def create_project_with_audit(user, organization, name, description):
        """Create project and log action."""
        project = Project.objects.create(
            organization=organization,
            name=name,
            description=description,
            created_by=user
        )
        
        # Make creator the owner
        ProjectRole.objects.create(
            user=user,
            project=project,
            role=ProjectRole.OWNER
        )
        
        # Phase 5: Log action
        AuditLog.objects.create(
            organization=organization,
            user=user,
            action=AuditLog.ACTION_CREATE,
            content_type='project',
            object_id=project.id,
            object_name=project.name,
            changes={'name': name, 'description': description}
        )
        
        return project
    
    @staticmethod
    def add_member_with_audit(user, project, member_user, role):
        """Add member to project and log action."""
        # Check if user is owner/admin
        user_role = ProjectRole.objects.filter(user=user, project=project).first()
        if not user_role or user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN]:
            raise ValidationError("Only owner and admin can add members.")
        
        # Prevent privilege escalation (admin can't assign owner)
        if user_role.role == ProjectRole.ADMIN and role == ProjectRole.OWNER:
            raise ValidationError("Admin cannot assign owner role.")
        
        # Create or update membership
        project_role, created = ProjectRole.objects.get_or_create(
            user=member_user,
            project=project,
            defaults={'role': role}
        )
        
        if not created:
            project_role.role = role
            project_role.save()
        
        # Phase 5: Log action
        AuditLog.objects.create(
            organization=project.organization,
            user=user,
            action=AuditLog.ACTION_CREATE if created else AuditLog.ACTION_UPDATE,
            content_type='projectrole',
            object_id=project_role.id,
            object_name=f"{member_user.email} - {role}",
            changes={'role': role}
        )
        
        return project_role
