from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from orgs.models import Organization
import re

User = get_user_model()


class TaskLabel(models.Model):
    """
    Phase 8: Custom labels for tasks with colors, icons, and descriptions.
    Labels can be project-specific or organization-wide.
    """
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6366f1', help_text="Hex color code")
    bg_color = models.CharField(max_length=7, default='#eef2ff', help_text="Background color for light mode")
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name from lucide-react")
    description = models.CharField(max_length=200, blank=True, null=True)
    banner_url = models.URLField(max_length=500, blank=True, null=True, help_text="Optional banner image URL")
    
    # Scope: can be org-wide or project-specific
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='task_labels', null=True, blank=True)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='labels', null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_labels')
    created_at = models.DateTimeField(auto_now_add=True)
    is_default = models.BooleanField(default=False, help_text="Default labels available to all")
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['project']),
        ]
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_default_labels(cls):
        """Get or create default labels."""
        defaults = [
            {'name': 'Bug', 'color': '#ef4444', 'bg_color': '#fef2f2', 'icon': 'Bug', 'is_default': True},
            {'name': 'Feature', 'color': '#10b981', 'bg_color': '#ecfdf5', 'icon': 'Sparkles', 'is_default': True},
            {'name': 'Enhancement', 'color': '#3b82f6', 'bg_color': '#eff6ff', 'icon': 'Zap', 'is_default': True},
            {'name': 'Documentation', 'color': '#8b5cf6', 'bg_color': '#f5f3ff', 'icon': 'FileText', 'is_default': True},
            {'name': 'Urgent', 'color': '#f59e0b', 'bg_color': '#fffbeb', 'icon': 'AlertTriangle', 'is_default': True},
            {'name': 'Help Wanted', 'color': '#ec4899', 'bg_color': '#fdf2f8', 'icon': 'HelpCircle', 'is_default': True},
        ]
        labels = []
        for default in defaults:
            label, _ = cls.objects.get_or_create(
                name=default['name'],
                is_default=True,
                defaults=default
            )
            labels.append(label)
        return labels


class TaskSection(models.Model):
    """
    Phase 7: Custom task sections/tabs for projects.
    Allows mods and admins to create custom workflow stages.
    Phase 8: Enhanced with descriptions, icons, and banners.
    """
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100)  # URL-friendly version of name
    color = models.CharField(max_length=7, default='#6366f1', help_text="Hex color code for the tab")
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name from lucide-react")
    description = models.CharField(max_length=200, blank=True, null=True, help_text="Section description")
    banner_url = models.URLField(max_length=500, blank=True, null=True, help_text="Optional banner image URL")
    position = models.PositiveIntegerField(default=0, help_text="Order of the section in tabs")
    is_default = models.BooleanField(default=False, help_text="Whether this is a default section")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_sections')
    
    class Meta:
        ordering = ['position']
        unique_together = ('project', 'slug')
        indexes = [
            models.Index(fields=['project', 'position']),
        ]
    
    def __str__(self):
        return f"{self.project.name} - {self.name}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.name.lower().replace(' ', '_').replace('-', '_')
        super().save(*args, **kwargs)
    
    @classmethod
    def create_default_sections(cls, project, user):
        """Create default sections for a new project."""
        defaults = [
            {'name': 'To Do', 'slug': 'todo', 'color': '#6b7280', 'position': 0, 'is_default': True},
            {'name': 'In Progress', 'slug': 'in_progress', 'color': '#3b82f6', 'position': 1, 'is_default': True},
            {'name': 'In Review', 'slug': 'review', 'color': '#f59e0b', 'position': 2, 'is_default': True},
            {'name': 'Done', 'slug': 'done', 'color': '#10b981', 'position': 3, 'is_default': True},
        ]
        sections = []
        for default in defaults:
            section = cls.objects.create(project=project, created_by=user, **default)
            sections.append(section)
        return sections


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
    Phase 6: Added time tracking features
    Phase 7: Added section support for custom workflow stages
    Phase 8: Added labels, focus mode, enhanced descriptions
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    rich_description = models.TextField(blank=True, null=True, help_text="Rich text description with formatting")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    # Store deleted user info for reference
    assigned_to_username = models.CharField(max_length=30, blank=True, null=True, help_text="Preserved username if user deleted")
    assigned_to_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.TODO)
    # Phase 7: Section for custom workflow stages (optional, falls back to status if null)
    section = models.ForeignKey(TaskSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    # Phase 8: Labels
    labels = models.ManyToManyField(TaskLabel, blank=True, related_name='tasks')
    priority = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    due_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)  # Phase 4: Soft delete support
    
    # Phase 6: Time tracking fields
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, help_text="Estimated hours to complete")
    time_spent_minutes = models.PositiveIntegerField(default=0, help_text="Total minutes spent on task")
    started_at = models.DateTimeField(blank=True, null=True, help_text="When work started on this task")
    completed_at = models.DateTimeField(blank=True, null=True, help_text="When task was completed")
    is_timer_running = models.BooleanField(default=False, help_text="Whether timer is currently running")
    timer_started_at = models.DateTimeField(blank=True, null=True, help_text="When the current timer session started")
    position = models.PositiveIntegerField(default=0, help_text="Position in kanban column for ordering")
    
    class Meta:
        ordering = ['position', '-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['deleted_at']),  # Phase 4: Index for soft delete filtering
            models.Index(fields=['project', 'status', 'position']),  # Phase 6: For kanban ordering
            models.Index(fields=['project', 'section', 'position']),  # Phase 7: For section ordering
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
    
    def start_timer(self):
        """Phase 6: Start the task timer."""
        if not self.is_timer_running:
            self.is_timer_running = True
            self.timer_started_at = timezone.now()
            if not self.started_at:
                self.started_at = timezone.now()
            self.save()
    
    def stop_timer(self):
        """Phase 6: Stop the task timer and add elapsed time."""
        if self.is_timer_running and self.timer_started_at:
            elapsed = timezone.now() - self.timer_started_at
            self.time_spent_minutes += int(elapsed.total_seconds() / 60)
            self.is_timer_running = False
            self.timer_started_at = None
            self.save()
    
    def get_time_spent_display(self):
        """Phase 6: Get formatted time spent string."""
        hours = self.time_spent_minutes // 60
        minutes = self.time_spent_minutes % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


class TaskAttachment(models.Model):
    """
    Phase 8: Attachments for tasks (images, videos, PDFs, etc.).
    """
    ATTACHMENT_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('pdf', 'PDF'),
        ('other', 'Other'),
    ]
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    file_url = models.URLField(max_length=500, help_text="URL to the file")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, default='other')
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True, help_text="Thumbnail for images/videos")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_attachments')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['task', '-uploaded_at']),
        ]
    
    def __str__(self):
        return f"{self.file_name} on {self.task.title}"


class TaskComment(models.Model):
    """
    Phase 8: Comments on tasks with @mention support.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='task_comments')
    # Store author info in case user is deleted
    author_username = models.CharField(max_length=30, blank=True, null=True)
    author_name = models.CharField(max_length=255, blank=True, null=True)
    author_deleted = models.BooleanField(default=False)
    
    content = models.TextField()
    # Mentions stored as list of usernames
    mentions = models.JSONField(default=list, blank=True, help_text="List of mentioned usernames")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
        ]
    
    def __str__(self):
        return f"Comment by {self.author_username or 'Unknown'} on {self.task.title}"
    
    def save(self, *args, **kwargs):
        # Extract @mentions from content
        if self.content:
            mentions = re.findall(r'@(\w+)', self.content)
            self.mentions = list(set(mentions))
        
        # Store author info
        if self.author and not self.author_username:
            self.author_username = self.author.username
            self.author_name = self.author.get_full_name()
        
        super().save(*args, **kwargs)


class FocusedTask(models.Model):
    """
    Phase 8: Focus mode - users can focus on specific tasks in their personal space.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='focused_tasks')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='focused_by')
    focused_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True, help_text="Personal notes for this focus session")
    
    class Meta:
        unique_together = ('user', 'task')
        ordering = ['-focused_at']
        indexes = [
            models.Index(fields=['user', '-focused_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} focusing on {self.task.title}"


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
