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
