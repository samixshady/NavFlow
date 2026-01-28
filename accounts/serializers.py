from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Notification
import re

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles validation of email, username, password, and user data.
    Phase 8: Added username field.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=30)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password_confirm']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_username(self, value):
        """Validate username format and uniqueness."""
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                'Username can only contain letters, numbers, and underscores.'
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                'This username is already taken.'
            )
        return value.lower()  # Store usernames in lowercase
    
    def validate(self, data):
        """
        Validate that passwords match and don't violate constraints.
        """
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError(
                {'password': 'Passwords do not match.'}
            )
        
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError(
                {'email': 'This email is already registered.'}
            )
        
        return data
    
    def create(self, validated_data):
        """
        Create a new user with the validated data.
        Password is hashed automatically by Django.
        """
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        return user
    
    def to_representation(self, instance):
        """
        Return user data without exposing password.
        """
        return {
            'id': instance.id,
            'email': instance.email,
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that returns additional user information.
    Phase 8: Supports login by email or username.
    """
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow login with either email or username
        self.fields['email'] = serializers.CharField()
    
    def validate(self, attrs):
        # Get the credential (could be email or username)
        credential = attrs.get('email', '')
        password = attrs.get('password', '')
        
        # Try to find user by email or username
        try:
            if '@' in credential:
                user = User.objects.get(email__iexact=credential)
            else:
                user = User.objects.get(username__iexact=credential)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'detail': 'No account found with this email/username.'}
            )
        
        # Check if user is active and not deleted
        if not user.is_active or getattr(user, 'is_deleted', False):
            raise serializers.ValidationError(
                {'detail': 'This account has been deactivated.'}
            )
        
        # Check password
        if not user.check_password(password):
            raise serializers.ValidationError(
                {'detail': 'Invalid password.'}
            )
        
        # Set user for token generation
        self.user = user
        
        # Generate tokens
        refresh = self.get_token(user)
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['username'] = user.username
        token['name'] = f"{user.first_name} {user.last_name}".strip()
        
        return token


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for reading user details.
    Phase 7: Extended with profile fields.
    Phase 8: Added username support.
    """
    full_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    unread_notifications_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'display_name', 'initials',
            'avatar', 'bio', 'job_title', 'department', 'phone', 'location',
            'linkedin_url', 'github_url', 'website_url',
            'notification_email', 'notification_push', 'theme_preference',
            'date_joined', 'last_login', 'unread_notifications_count'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'full_name', 'initials', 'unread_notifications_count', 'display_name']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_initials(self, obj):
        return obj.get_initials()
    
    def get_display_name(self, obj):
        return obj.get_display_name() if hasattr(obj, 'get_display_name') else obj.get_full_name()
    
    def get_unread_notifications_count(self, obj):
        return obj.notifications.filter(is_read=False).count()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Phase 7: Serializer for updating user profile.
    """
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'avatar', 'bio', 'job_title', 'department',
            'phone', 'location', 'linkedin_url', 'github_url', 'website_url',
            'notification_email', 'notification_push', 'theme_preference'
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """
    Phase 7: Serializer for notifications.
    Phase 8: Enhanced with actionable notifications and username support.
    """
    time_ago = serializers.SerializerMethodField()
    is_actionable = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'link', 'is_read',
            'created_at', 'time_ago', 'related_task_id', 'related_project_id',
            'related_org_id', 'related_comment_id',
            'actor_id', 'actor_name', 'actor_username',
            'action_status', 'action_data', 'is_actionable'
        ]
        read_only_fields = ['id', 'created_at', 'time_ago', 'is_actionable']
    
    def get_is_actionable(self, obj):
        return obj.is_actionable
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            mins = int(diff.total_seconds() / 60)
            return f"{mins}m ago"
        elif diff < timedelta(hours=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d")


class AccountDeleteSerializer(serializers.Serializer):
    """
    Phase 8: Serializer for account deletion confirmation.
    """
    password = serializers.CharField(write_only=True, required=True)
    confirm_text = serializers.CharField(write_only=True, required=True)
    
    def validate_confirm_text(self, value):
        if value != 'DELETE':
            raise serializers.ValidationError('Please type DELETE to confirm.')
        return value
    
    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect password.')
        return value
