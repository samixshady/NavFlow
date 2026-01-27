from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Notification

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles validation of email, password, and user data.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
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
            'first_name': instance.first_name,
            'last_name': instance.last_name,
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that returns additional user information.
    """
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['name'] = f"{user.first_name} {user.last_name}".strip()
        
        return token
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['name'] = f"{user.first_name} {user.last_name}".strip()
        
        return token
    
    def to_representation(self, instance):
        """
        Customize the response to include user information.
        """
        response = super().to_representation(instance)
        response['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        }
        return response


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for reading user details.
    Phase 7: Extended with profile fields.
    """
    full_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    unread_notifications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'initials',
            'avatar', 'bio', 'job_title', 'department', 'phone', 'location',
            'linkedin_url', 'github_url', 'website_url',
            'notification_email', 'notification_push', 'theme_preference',
            'date_joined', 'last_login', 'unread_notifications_count'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'full_name', 'initials', 'unread_notifications_count']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_initials(self, obj):
        return obj.get_initials()
    
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
    """
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'link', 'is_read',
            'created_at', 'time_ago', 'related_task_id', 'related_project_id',
            'actor_id', 'actor_name'
        ]
        read_only_fields = ['id', 'created_at', 'time_ago']
    
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
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d")
