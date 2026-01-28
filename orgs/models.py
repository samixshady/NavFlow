from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class Organization(models.Model):
    """
    Organization model that groups users together.
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
    
    def get_owner(self):
        """Get the owner of this organization."""
        return self.memberships.filter(role=Membership.OWNER).first()


class MembershipManager(models.Manager):
    """Custom manager for Membership model."""
    
    def get_by_user_and_org(self, user, organization):
        """Get membership for a specific user and organization."""
        return self.get(user=user, organization=organization)
    
    def get_org_members(self, organization):
        """Get all members of an organization."""
        return self.filter(organization=organization)
    
    def get_user_orgs(self, user):
        """Get all organizations a user belongs to."""
        return self.filter(user=user).select_related('organization')
    
    def get_admins_and_owners(self, organization):
        """Get all admins and owners of an organization."""
        return self.filter(
            organization=organization,
            role__in=[Membership.ADMIN, Membership.OWNER]
        )


class Membership(models.Model):
    """
    Through model for User-Organization many-to-many relationship with roles.
    """
    # Role choices
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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    objects = MembershipManager()
    
    class Meta:
        unique_together = ('user', 'organization')
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['organization', 'role']),
            models.Index(fields=['user', 'organization']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"
    
    def clean(self):
        """
        Validate that:
        1. There is only one owner per organization
        2. Only one membership per user-org combination (handled by unique_together)
        """
        if self.role == self.OWNER:
            # Check if organization already has an owner
            existing_owner = Membership.objects.filter(
                organization=self.organization,
                role=self.OWNER
            ).exclude(id=self.id).exists()
            
            if existing_owner:
                raise ValidationError(
                    f"Organization '{self.organization.name}' already has an owner. "
                    "Only one owner per organization is allowed."
                )
    
    def save(self, *args, **kwargs):
        """Call full_clean before saving."""
        self.full_clean()
        super().save(*args, **kwargs)


class Invitation(models.Model):
    """
    Invitation model for inviting users to organizations.
    Users can be invited by their username.
    """
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    EXPIRED = 'expired'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (DECLINED, 'Declined'),
        (EXPIRED, 'Expired'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    invited_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    role = models.CharField(max_length=20, choices=Membership.ROLE_CHOICES, default=Membership.MEMBER)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invited_user', 'status']),
            models.Index(fields=['organization', 'status']),
        ]
    
    def __str__(self):
        return f"Invitation for {self.invited_user.email} to {self.organization.name} ({self.status})"
    
    def accept(self):
        """Accept the invitation and create membership."""
        from django.utils import timezone
        if self.status != self.PENDING:
            raise ValidationError("Can only accept pending invitations.")
        
        # Check if user is already a member
        if Membership.objects.filter(user=self.invited_user, organization=self.organization).exists():
            self.status = self.EXPIRED
            self.responded_at = timezone.now()
            self.save()
            raise ValidationError("User is already a member of this organization.")
        
        # Create membership
        Membership.objects.create(
            user=self.invited_user,
            organization=self.organization,
            role=self.role
        )
        
        self.status = self.ACCEPTED
        self.responded_at = timezone.now()
        self.save()
        return True
    
    def decline(self):
        """Decline the invitation."""
        from django.utils import timezone
        if self.status != self.PENDING:
            raise ValidationError("Can only decline pending invitations.")
        
        self.status = self.DECLINED
        self.responded_at = timezone.now()
        self.save()
        return True


class OrgPermissions(models.Model):
    """
    Permission presets for each role in an organization.
    Each organization can customize what each role can do.
    """
    organization = models.OneToOneField(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='permissions'
    )
    
    # Admin permissions
    admin_create_project = models.BooleanField(default=True)
    admin_delete_project = models.BooleanField(default=True)
    admin_create_task = models.BooleanField(default=True)
    admin_delete_task = models.BooleanField(default=True)
    admin_assign_task = models.BooleanField(default=True)
    admin_view_all_tasks = models.BooleanField(default=True)
    admin_view_unassigned_tasks = models.BooleanField(default=True)
    admin_create_label = models.BooleanField(default=True)
    admin_delete_label = models.BooleanField(default=True)
    admin_manage_timer = models.BooleanField(default=True)
    admin_invite_members = models.BooleanField(default=True)
    admin_remove_members = models.BooleanField(default=False)
    admin_change_member_roles = models.BooleanField(default=False)
    
    # Moderator permissions
    mod_create_project = models.BooleanField(default=True)
    mod_delete_project = models.BooleanField(default=False)
    mod_create_task = models.BooleanField(default=True)
    mod_delete_task = models.BooleanField(default=True)
    mod_assign_task = models.BooleanField(default=True)
    mod_view_all_tasks = models.BooleanField(default=True)
    mod_view_unassigned_tasks = models.BooleanField(default=True)
    mod_create_label = models.BooleanField(default=True)
    mod_delete_label = models.BooleanField(default=False)
    mod_manage_timer = models.BooleanField(default=True)
    mod_invite_members = models.BooleanField(default=False)
    mod_remove_members = models.BooleanField(default=False)
    mod_change_member_roles = models.BooleanField(default=False)
    
    # Member permissions
    member_create_project = models.BooleanField(default=False)
    member_delete_project = models.BooleanField(default=False)
    member_create_task = models.BooleanField(default=True)
    member_delete_task = models.BooleanField(default=False)
    member_assign_task = models.BooleanField(default=False)
    member_view_all_tasks = models.BooleanField(default=True)
    member_view_unassigned_tasks = models.BooleanField(default=False)
    member_create_label = models.BooleanField(default=False)
    member_delete_label = models.BooleanField(default=False)
    member_manage_timer = models.BooleanField(default=True)
    member_invite_members = models.BooleanField(default=False)
    member_remove_members = models.BooleanField(default=False)
    member_change_member_roles = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Organization Permissions'
        verbose_name_plural = 'Organization Permissions'
    
    def __str__(self):
        return f"Permissions for {self.organization.name}"
    
    def get_permissions_for_role(self, role):
        """Get all permissions for a specific role."""
        prefix_map = {
            'owner': None,  # Owners have all permissions
            'admin': 'admin_',
            'moderator': 'mod_',
            'member': 'member_'
        }
        
        if role == 'owner':
            # Owners always have all permissions
            return {
                'create_project': True,
                'delete_project': True,
                'create_task': True,
                'delete_task': True,
                'assign_task': True,
                'view_all_tasks': True,
                'view_unassigned_tasks': True,
                'create_label': True,
                'delete_label': True,
                'manage_timer': True,
                'invite_members': True,
                'remove_members': True,
                'change_member_roles': True,
            }
        
        prefix = prefix_map.get(role, 'member_')
        permissions = {}
        
        for field in self._meta.fields:
            if field.name.startswith(prefix):
                perm_name = field.name[len(prefix):]
                permissions[perm_name] = getattr(self, field.name)
        
        return permissions
    
    def has_permission(self, role, permission):
        """Check if a role has a specific permission."""
        if role == 'owner':
            return True
        
        prefix_map = {
            'admin': 'admin_',
            'moderator': 'mod_',
            'member': 'member_'
        }
        
        prefix = prefix_map.get(role, 'member_')
        field_name = f"{prefix}{permission}"
        
        return getattr(self, field_name, False)
    
    @classmethod
    def create_for_org(cls, organization):
        """Create default permissions for an organization."""
        return cls.objects.create(organization=organization)
