from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Task, ProjectRole, AuditLog, TaskSection

User = get_user_model()


class TaskSectionSerializer(serializers.ModelSerializer):
    """Phase 7: Serializer for task sections."""
    task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskSection
        fields = ['id', 'name', 'slug', 'color', 'icon', 'position', 'is_default', 'task_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'task_count']
    
    def get_task_count(self, obj):
        return obj.tasks.filter(deleted_at__isnull=True).count()


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
    project_name = serializers.CharField(source='project.name', read_only=True)
    time_spent_display = serializers.CharField(source='get_time_spent_display', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True, allow_null=True)
    section_color = serializers.CharField(source='section.color', read_only=True, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project', 'project_name', 'status', 'status_display',
            'section', 'section_name', 'section_color',
            'priority', 'priority_display', 'assigned_to', 'assigned_to_email', 'created_by_email',
            'due_date', 'created_at', 'updated_at', 'estimated_hours', 'time_spent_minutes',
            'time_spent_display', 'started_at', 'completed_at', 'is_timer_running',
            'timer_started_at', 'position'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_email', 'time_spent_display']


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for projects with members and tasks."""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    roles = ProjectRoleSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    sections = TaskSectionSerializer(many=True, read_only=True)  # Phase 7: Include sections
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'organization_name', 'status',
            'owner_email', 'member_count', 'task_count', 'user_role',
            'roles', 'tasks', 'sections', 'created_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'organization_name', 'owner_email', 'member_count',
            'task_count', 'roles', 'tasks', 'sections', 'created_by_email', 'created_at', 'updated_at'
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
