from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Organization, Membership, Invitation, OrgPermissions

User = get_user_model()


class MembershipSerializer(serializers.ModelSerializer):
    """Serializer for viewing membership details."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = Membership
        fields = ['id', 'user_email', 'user_name', 'role', 'role_display', 'joined_at']
        read_only_fields = ['id', 'joined_at']
    
    def get_user_name(self, obj):
        """Get user's full name."""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating organizations."""
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    members = MembershipSerializer(source='memberships', many=True, read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'owner_email', 'member_count', 'user_role', 'members', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner_email', 'member_count', 'user_role', 'members', 'created_at', 'updated_at']
    
    def get_owner_email(self, obj):
        """Get the owner's email."""
        owner = obj.get_owner()
        return owner.user.email if owner else None
    
    def get_member_count(self, obj):
        """Get the number of members."""
        return obj.memberships.count()
    
    def get_user_role(self, obj):
        """Get the current user's role in this organization."""
        user = self.context.get('user')
        if user:
            try:
                membership = obj.memberships.get(user=user)
                return membership.role
            except Membership.DoesNotExist:
                return None
        return None


class OrganizationListSerializer(serializers.ModelSerializer):
    """Serializer for listing organizations (simplified)."""
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'owner_email', 'member_count', 'user_role', 'created_at']
        read_only_fields = fields
    
    def get_owner_email(self, obj):
        """Get the owner's email."""
        owner = obj.get_owner()
        return owner.user.email if owner else None
    
    def get_member_count(self, obj):
        """Get the number of members."""
        return obj.memberships.count()
    
    def get_user_role(self, obj):
        """Get the current user's role in this organization."""
        user = self.context.get('user')
        if user:
            try:
                membership = obj.memberships.get(user=user)
                return membership.role
            except Membership.DoesNotExist:
                return None
        return None


class AddMemberSerializer(serializers.Serializer):
    """Serializer for adding a member to an organization."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.ROLE_CHOICES, default=Membership.MEMBER)
    
    def validate_email(self, value):
        """Validate that the email corresponds to an existing user."""
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    
    def validate(self, data):
        """Additional validation."""
        organization = self.context.get('organization')
        email = data.get('email')
        role = data.get('role')
        
        # Check if user is already a member
        user = User.objects.get(email=email)
        if Membership.objects.filter(user=user, organization=organization).exists():
            raise serializers.ValidationError(
                {"email": f"{email} is already a member of this organization."}
            )
        
        # Prevent adding multiple owners
        if role == Membership.OWNER and organization.get_owner():
            raise serializers.ValidationError(
                {"role": "This organization already has an owner. Only one owner per organization is allowed."}
            )
        
        return data


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for viewing invitations."""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    invited_user_email = serializers.CharField(source='invited_user.email', read_only=True)
    invited_user_username = serializers.CharField(source='invited_user.username', read_only=True)
    invited_by_email = serializers.CharField(source='invited_by.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'organization', 'organization_name', 
            'invited_user_email', 'invited_user_username',
            'invited_by_email', 'role', 'role_display',
            'status', 'status_display', 'created_at', 'responded_at'
        ]
        read_only_fields = fields


class CreateInvitationSerializer(serializers.Serializer):
    """Serializer for creating an invitation by email or username."""
    identifier = serializers.CharField(max_length=255, help_text="Username or email of the user to invite")
    role = serializers.ChoiceField(
        choices=[
            (Membership.ADMIN, 'Admin'),
            (Membership.MODERATOR, 'Moderator'),
            (Membership.MEMBER, 'Member'),
        ],
        default=Membership.MEMBER
    )
    
    def validate_identifier(self, value):
        """Validate that the username or email exists."""
        # Try to find user by email first, then by username
        user = User.objects.filter(email=value).first()
        if not user:
            user = User.objects.filter(username=value).first()
        if not user:
            raise serializers.ValidationError(f"User '{value}' does not exist. Please enter a valid email or username.")
        return value
    
    def validate(self, data):
        """Additional validation."""
        organization = self.context.get('organization')
        inviting_user = self.context.get('user')
        identifier = data.get('identifier')
        
        # Find user by email or username
        user = User.objects.filter(email=identifier).first()
        if not user:
            user = User.objects.filter(username=identifier).first()
        
        # Can't invite yourself
        if user == inviting_user:
            raise serializers.ValidationError(
                {"identifier": "You cannot invite yourself."}
            )
        
        # Check if user is already a member
        if Membership.objects.filter(user=user, organization=organization).exists():
            raise serializers.ValidationError(
                {"identifier": f"{identifier} is already a member of this organization."}
            )
        
        # Check if there's already a pending invitation
        if Invitation.objects.filter(
            invited_user=user, 
            organization=organization, 
            status=Invitation.PENDING
        ).exists():
            raise serializers.ValidationError(
                {"identifier": f"There's already a pending invitation for {identifier}."}
            )
        
        return data


class UpdateMemberRoleSerializer(serializers.Serializer):
    """Serializer for updating a member's role."""
    user_email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            (Membership.ADMIN, 'Admin'),
            (Membership.MODERATOR, 'Moderator'),
            (Membership.MEMBER, 'Member'),
        ]
    )
    
    def validate_user_email(self, value):
        """Validate that the email corresponds to an existing user."""
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    
    def validate(self, data):
        """Validate role change."""
        organization = self.context.get('organization')
        requesting_user = self.context.get('user')
        email = data.get('user_email')
        
        user = User.objects.get(email=email)
        
        # Check if target user is a member
        try:
            membership = Membership.objects.get(user=user, organization=organization)
        except Membership.DoesNotExist:
            raise serializers.ValidationError(
                {"user_email": "User is not a member of this organization."}
            )
        
        # Can't change owner's role
        if membership.role == Membership.OWNER:
            raise serializers.ValidationError(
                {"user_email": "Cannot change the owner's role."}
            )
        
        return data


class OrgPermissionsSerializer(serializers.ModelSerializer):
    """Serializer for organization permissions."""
    
    class Meta:
        model = OrgPermissions
        exclude = ['id', 'organization', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Return organized permission data."""
        data = super().to_representation(instance)
        
        # Organize by role
        organized = {
            'admin': {},
            'moderator': {},
            'member': {}
        }
        
        for key, value in data.items():
            if key.startswith('admin_'):
                perm_name = key[6:]  # Remove 'admin_' prefix
                organized['admin'][perm_name] = value
            elif key.startswith('mod_'):
                perm_name = key[4:]  # Remove 'mod_' prefix
                organized['moderator'][perm_name] = value
            elif key.startswith('member_'):
                perm_name = key[7:]  # Remove 'member_' prefix
                organized['member'][perm_name] = value
        
        # Owner always has all permissions
        organized['owner'] = {
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
        
        return organized


class OrgPermissionsUpdateSerializer(serializers.Serializer):
    """Serializer for updating organization permissions."""
    role = serializers.ChoiceField(choices=['admin', 'moderator', 'member'])
    permission = serializers.CharField()
    value = serializers.BooleanField()
    
    def validate_permission(self, value):
        """Validate that the permission is valid."""
        valid_permissions = [
            'create_project', 'delete_project', 'create_task', 'delete_task',
            'assign_task', 'view_all_tasks', 'view_unassigned_tasks',
            'create_label', 'delete_label', 'manage_timer',
            'invite_members', 'remove_members', 'change_member_roles'
        ]
        if value not in valid_permissions:
            raise serializers.ValidationError(f"Invalid permission: {value}")
        return value


class OrgMemberWithPermissionsSerializer(serializers.ModelSerializer):
    """Serializer for members with their computed permissions."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Membership
        fields = ['id', 'user_email', 'user_name', 'username', 'role', 'role_display', 'joined_at', 'permissions']
        read_only_fields = fields
    
    def get_user_name(self, obj):
        """Get user's full name."""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_permissions(self, obj):
        """Get computed permissions for this member."""
        try:
            org_permissions = obj.organization.permissions
            return org_permissions.get_permissions_for_role(obj.role)
        except OrgPermissions.DoesNotExist:
            # If no permissions exist, create defaults
            org_permissions = OrgPermissions.create_for_org(obj.organization)
            return org_permissions.get_permissions_for_role(obj.role)
