from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from orgs.models import Organization

User = get_user_model()


class ProjectRole(models.Model):
    """
    Role for users within a project.
    Defines permission levels for project members.
    """
    OWNER = 'owner'
    ADMIN = 'admin'
    MODERATOR = 'moderator'
    MEMBER = 'member'
    
    ROLE_CHOICES = [
        (OWNER, 'Owner'),
        (ADMIN, 'Admin'),
        (MODERATOR, 'Moderator'),
        (MEMBER, 'Member'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_roles')
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='roles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=MEMBER)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'project')
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['project', 'role']),
            models.Index(fields=['user', 'project']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.role})"
    
    def clean(self):
        """Validate that project is in user's organization."""
        if self.project.organization not in User.objects.filter(id=self.user.id).values_list('memberships__organization', flat=True):
            raise ValidationError("User must be a member of the project's organization.")


class Project(models.Model):
    """
    Project model that belongs to an organization.
    Contains tasks and project members with roles.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='projects')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('archived', 'Archived')],
        default='active'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['organization', 'name'], name='unique_project_per_org')
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"
    
    def get_owner(self):
        """Get the owner of this project."""
        return self.roles.filter(role=ProjectRole.OWNER).first()
    
    def get_members_with_role(self, role):
        """Get all members with a specific role."""
        return self.roles.filter(role=role)


class TaskStatus(models.TextChoices):
    TODO = 'todo', 'To Do'
    IN_PROGRESS = 'in_progress', 'In Progress'
    REVIEW = 'review', 'In Review'
    DONE = 'done', 'Done'


class Task(models.Model):
    """
    Task model that belongs to a project.
    Tasks are the work items in a project.
    Phase 4: Added soft delete (deleted_at) support
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.TODO)
    priority = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    due_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)  # Phase 4: Soft delete support
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['deleted_at']),  # Phase 4: Index for soft delete filtering
        ]
    
    def __str__(self):
        return f"{self.title} ({self.project.name})"
    
    @classmethod
    def get_active(cls):
        """Phase 4: Return only non-deleted tasks."""
        return cls.objects.filter(deleted_at__isnull=True)
    
    def soft_delete(self):
        """Phase 4: Mark task as deleted without removing from DB."""
        self.deleted_at = timezone.now()
        self.save()


class AuditLog(models.Model):
    """
    Phase 5: Audit log for tracking changes across the system.
    Records who did what, when, and in which organization.
    """
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Created'),
        (ACTION_UPDATE, 'Updated'),
        (ACTION_DELETE, 'Deleted'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    content_type = models.CharField(max_length=50)  # 'project', 'task', 'projectrole'
    object_id = models.IntegerField()
    object_name = models.CharField(max_length=255)  # Name for display
    changes = models.JSONField(default=dict, blank=True)  # What changed {field: [old, new]}
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.email} {self.action} {self.content_type} at {self.timestamp}"
