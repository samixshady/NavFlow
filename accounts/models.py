from django.contrib.auth.models import AbstractUser, UserManager as BaseUserManager
from django.db import models
from django.core.validators import RegexValidator


username_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9_]+$',
    message='Username can only contain letters, numbers, and underscores.'
)


class CustomUserManager(BaseUserManager):
    """Custom user manager that uses email instead of username."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)
    
    def get_by_natural_key(self, username):
        """Allow login by email or username."""
        return self.get(
            models.Q(email__iexact=username) | models.Q(username__iexact=username)
        )


class CustomUser(AbstractUser):
    """
    Custom User model extending AbstractUser.
    Uses email as the primary login field instead of username.
    Phase 7: Added profile fields for enhanced user profiles.
    Phase 8: Added unique username support for mentions and invitations.
    """
    email = models.EmailField(unique=True)
    username = models.CharField(
        max_length=30, 
        unique=True,
        validators=[username_validator],
        help_text="Unique username for mentions and invitations (3-30 chars, letters, numbers, underscores)"
    )
    
    # Account status
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    # Phase 7: Profile fields
    avatar = models.URLField(max_length=500, blank=True, null=True, help_text="URL to profile picture")
    bio = models.TextField(max_length=500, blank=True, null=True, help_text="Short bio about the user")
    job_title = models.CharField(max_length=100, blank=True, null=True, help_text="User's job title")
    department = models.CharField(max_length=100, blank=True, null=True, help_text="Department or team")
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="Phone number")
    location = models.CharField(max_length=100, blank=True, null=True, help_text="Location/timezone")
    linkedin_url = models.URLField(max_length=200, blank=True, null=True, help_text="LinkedIn profile URL")
    github_url = models.URLField(max_length=200, blank=True, null=True, help_text="GitHub profile URL")
    website_url = models.URLField(max_length=200, blank=True, null=True, help_text="Personal website URL")
    notification_email = models.BooleanField(default=True, help_text="Receive email notifications")
    notification_push = models.BooleanField(default=True, help_text="Receive push notifications")
    theme_preference = models.CharField(max_length=10, choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')], default='system')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.username or self.email
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email
    
    def get_initials(self):
        """Get user initials for avatar fallback."""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        return self.email[0].upper()
    
    def get_display_name(self):
        """Get display name: full name if available, else username."""
        full_name = self.get_full_name()
        if full_name and full_name != self.email:
            return full_name
        return f"@{self.username}"
    
    def soft_delete(self):
        """Soft delete user account."""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()


class Notification(models.Model):
    """
    Phase 7: Notification model for task assignments and updates.
    Phase 8: Enhanced with actionable notifications (accept/deny invitations).
    """
    NOTIFICATION_TYPES = [
        ('task_assigned', 'Task Assigned'),
        ('task_updated', 'Task Updated'),
        ('task_completed', 'Task Completed'),
        ('task_comment', 'Task Comment'),
        ('project_invite', 'Project Invitation'),
        ('org_invite', 'Organization Invitation'),
        ('mention', 'Mentioned'),
        ('deadline', 'Deadline Reminder'),
        ('invitation_accepted', 'Invitation Accepted'),
        ('invitation_declined', 'Invitation Declined'),
        ('member_left', 'Member Left'),
        ('account_deleted', 'Account Deleted'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('none', 'No Action Required'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True, help_text="URL to navigate to when clicked")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Actionable notification fields
    action_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='none')
    action_data = models.JSONField(default=dict, blank=True, help_text="Data needed to process action (e.g., invitation_id)")
    
    # Optional reference to the related object
    related_task_id = models.IntegerField(blank=True, null=True)
    related_project_id = models.IntegerField(blank=True, null=True)
    related_org_id = models.IntegerField(blank=True, null=True)
    related_comment_id = models.IntegerField(blank=True, null=True)
    actor_id = models.IntegerField(blank=True, null=True, help_text="User who triggered the notification")
    actor_name = models.CharField(max_length=255, blank=True, null=True)
    actor_username = models.CharField(max_length=30, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    @property
    def is_actionable(self):
        """Check if notification requires user action."""
        return self.type in ['org_invite', 'project_invite'] and self.action_status == 'pending'
