from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Task, ProjectRole, AuditLog

User = get_user_model()


class ProjectRoleSerializer(serializers.ModelSerializer):
    """Serializer for project roles."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = ProjectRole
        fields = ['id', 'user_email', 'user_name', 'role', 'role_display', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for tasks."""
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True, allow_null=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'status_display',
            'priority', 'priority_display', 'assigned_to_email', 'created_by_email',
            'due_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_email']


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for projects with members and tasks."""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    roles = ProjectRoleSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'organization_name', 'status',
            'owner_email', 'member_count', 'task_count', 'user_role',
            'roles', 'tasks', 'created_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'organization_name', 'owner_email', 'member_count',
            'task_count', 'roles', 'tasks', 'created_by_email', 'created_at', 'updated_at'
        ]
    
    def get_owner_email(self, obj):
        owner = obj.get_owner()
        return owner.user.email if owner else None
    
    def get_member_count(self, obj):
        return obj.roles.count()
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_user_role(self, obj):
        user = self.context.get('user')
        if user:
            try:
                role = ProjectRole.objects.get(user=user, project=obj)
                return role.role
            except ProjectRole.DoesNotExist:
                return None
        return None


class ProjectListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing projects."""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'organization_name', 'status',
            'owner_email', 'member_count', 'task_count', 'user_role', 'created_at'
        ]
        read_only_fields = fields
    
    def get_owner_email(self, obj):
        owner = obj.get_owner()
        return owner.user.email if owner else None
    
    def get_member_count(self, obj):
        return obj.roles.count()
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_user_role(self, obj):
        user = self.context.get('user')
        if user:
            try:
                role = ProjectRole.objects.get(user=user, project=obj)
                return role.role
            except ProjectRole.DoesNotExist:
                return None
        return None


class AddProjectMemberSerializer(serializers.Serializer):
    """Serializer for adding members to a project."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ProjectRole.ROLE_CHOICES, default=ProjectRole.MEMBER)
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    
    def validate(self, data):
        project = self.context.get('project')
        email = data.get('email')
        
        user = User.objects.get(email=email)
        if ProjectRole.objects.filter(user=user, project=project).exists():
            raise serializers.ValidationError(
                {"email": f"{email} is already a member of this project."}
            )
        
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    """Phase 5: Serializer for audit logs."""
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_email', 'action', 'action_display',
            'content_type', 'object_name', 'changes', 'timestamp'
        ]
        read_only_fields = fields
