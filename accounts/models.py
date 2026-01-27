from django.contrib.auth.models import AbstractUser, UserManager as BaseUserManager
from django.db import models


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


class CustomUser(AbstractUser):
    """
    Custom User model extending AbstractUser.
    Uses email as the primary login field instead of username.
    Phase 7: Added profile fields for enhanced user profiles.
    """
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=False, blank=True)
    
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
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email
    
    def get_initials(self):
        """Get user initials for avatar fallback."""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        return self.email[0].upper()


class Notification(models.Model):
    """
    Phase 7: Notification model for task assignments and updates.
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
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True, help_text="URL to navigate to when clicked")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional reference to the related object
    related_task_id = models.IntegerField(blank=True, null=True)
    related_project_id = models.IntegerField(blank=True, null=True)
    actor_id = models.IntegerField(blank=True, null=True, help_text="User who triggered the notification")
    actor_name = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
