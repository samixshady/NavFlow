from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Organization, Membership

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
    members = MembershipSerializer(source='memberships', many=True, read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'owner_email', 'member_count', 'members', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner_email', 'member_count', 'members', 'created_at', 'updated_at']
    
    def get_owner_email(self, obj):
        """Get the owner's email."""
        owner = obj.get_owner()
        return owner.user.email if owner else None
    
    def get_member_count(self, obj):
        """Get the number of members."""
        return obj.memberships.count()


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
