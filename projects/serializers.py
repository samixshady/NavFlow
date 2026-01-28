from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Task, ProjectRole, AuditLog, TaskSection, TaskLabel, TaskComment, TaskAttachment, FocusedTask

User = get_user_model()


class TaskLabelSerializer(serializers.ModelSerializer):
    """Phase 8: Serializer for task labels."""
    
    class Meta:
        model = TaskLabel
        fields = ['id', 'name', 'color', 'bg_color', 'icon', 'description', 'banner_url', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']


class TaskSectionSerializer(serializers.ModelSerializer):
    """Phase 7: Serializer for task sections."""
    task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskSection
        fields = ['id', 'name', 'slug', 'color', 'icon', 'description', 'banner_url', 'position', 'is_default', 'task_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'task_count']
    
    def get_task_count(self, obj):
        return obj.tasks.filter(deleted_at__isnull=True).count()


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Phase 8: Serializer for task attachments."""
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, allow_null=True)
    uploaded_by_name = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'file_url', 'file_name', 'file_type', 'file_size', 'file_size_display',
            'mime_type', 'thumbnail_url', 'uploaded_by', 'uploaded_by_username',
            'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by_username', 'uploaded_by_name', 'file_size_display']
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name()
        return None
    
    def get_file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"


class TaskCommentSerializer(serializers.ModelSerializer):
    """Phase 8: Serializer for task comments."""
    author_avatar = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'author_username', 'author_name', 'author_deleted',
            'author_avatar', 'author_initials', 'content', 'mentions',
            'created_at', 'updated_at', 'is_edited', 'time_ago'
        ]
        read_only_fields = [
            'id', 'author_username', 'author_name', 'author_deleted', 'author_avatar',
            'author_initials', 'mentions', 'created_at', 'updated_at', 'time_ago'
        ]
    
    def get_author_avatar(self, obj):
        if obj.author and not obj.author_deleted:
            return obj.author.avatar
        return None
    
    def get_author_initials(self, obj):
        if obj.author_name:
            parts = obj.author_name.split()
            if len(parts) >= 2:
                return f"{parts[0][0]}{parts[1][0]}".upper()
            elif parts:
                return parts[0][0].upper()
        if obj.author_username:
            return obj.author_username[0].upper()
        return "?"
    
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
            return obj.created_at.strftime("%b %d, %Y")


class ProjectRoleSerializer(serializers.ModelSerializer):
    """Serializer for project roles."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.CharField(source='user.avatar', read_only=True, allow_null=True)
    user_initials = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = ProjectRole
        fields = ['id', 'user', 'user_email', 'user_username', 'user_name', 'user_avatar', 'user_initials', 'role', 'role_display', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_user_initials(self, obj):
        return obj.user.get_initials()


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for tasks."""
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True, allow_null=True)
    assigned_to_username = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_avatar = serializers.SerializerMethodField()
    assigned_to_initials = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    organization_id = serializers.IntegerField(source='project.organization.id', read_only=True)
    organization_name = serializers.CharField(source='project.organization.name', read_only=True)
    time_spent_display = serializers.CharField(source='get_time_spent_display', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True, allow_null=True)
    section_color = serializers.CharField(source='section.color', read_only=True, allow_null=True)
    labels_data = TaskLabelSerializer(source='labels', many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    is_focused = serializers.SerializerMethodField()
    focused_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'rich_description', 'project', 'project_name',
            'organization_id', 'organization_name',
            'status', 'status_display', 'section', 'section_name', 'section_color',
            'priority', 'priority_display', 
            'assigned_to', 'assigned_to_email', 'assigned_to_username', 'assigned_to_name',
            'assigned_to_avatar', 'assigned_to_initials', 'assigned_to_deleted',
            'created_by_email', 'created_by_username',
            'labels', 'labels_data', 'comments_count', 'attachments_count', 'is_focused', 'focused_id',
            'due_date', 'created_at', 'updated_at', 'estimated_hours', 'time_spent_minutes',
            'time_spent_display', 'started_at', 'completed_at', 'is_timer_running',
            'timer_started_at', 'position'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_email', 'time_spent_display', 'comments_count', 'attachments_count']
    
    def get_assigned_to_username(self, obj):
        if obj.assigned_to_deleted and obj.assigned_to_username:
            return obj.assigned_to_username + " (deleted)"
        if obj.assigned_to:
            return obj.assigned_to.username
        return None
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return None
    
    def get_assigned_to_avatar(self, obj):
        if obj.assigned_to and not obj.assigned_to_deleted:
            return obj.assigned_to.avatar
        return None
    
    def get_assigned_to_initials(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_initials()
        return None
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()
    
    def get_is_focused(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FocusedTask.objects.filter(user=request.user, task=obj).exists()
        return False
    
    def get_focused_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            focused = FocusedTask.objects.filter(user=request.user, task=obj).first()
            if focused:
                return focused.id
        return None


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
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    owner_email = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'organization_id', 'organization_name', 'status',
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
    identifier = serializers.CharField(help_text="Email or username of the user to add")
    role = serializers.ChoiceField(choices=ProjectRole.ROLE_CHOICES, default=ProjectRole.MEMBER)
    
    def validate_identifier(self, value):
        # Try to find user by email or username
        if '@' in value:
            try:
                User.objects.get(email__iexact=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("User with this email does not exist.")
        else:
            try:
                User.objects.get(username__iexact=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("User with this username does not exist.")
        return value
    
    def validate(self, data):
        project = self.context.get('project')
        identifier = data.get('identifier')
        
        # Find user by email or username
        if '@' in identifier:
            user = User.objects.get(email__iexact=identifier)
        else:
            user = User.objects.get(username__iexact=identifier)
        
        if ProjectRole.objects.filter(user=user, project=project).exists():
            raise serializers.ValidationError(
                {"identifier": f"{identifier} is already a member of this project."}
            )
        
        data['user'] = user
        return data


class FocusedTaskSerializer(serializers.ModelSerializer):
    """Phase 8: Serializer for focused tasks in personal space."""
    task_data = TaskSerializer(source='task', read_only=True)
    
    class Meta:
        model = FocusedTask
        fields = ['id', 'task', 'task_data', 'focused_at', 'notes']
        read_only_fields = ['id', 'focused_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Phase 5: Serializer for audit logs with user filtering support."""
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'user_username', 'user_name', 'user_avatar',
            'action', 'action_display', 'content_type', 'object_id', 'object_name',
            'changes', 'timestamp', 'time_ago'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return "System"
    
    def get_user_avatar(self, obj):
        if obj.user:
            return obj.user.avatar
        return None
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.timestamp
        
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
            return obj.timestamp.strftime("%b %d, %Y")


class FocusedTaskSerializer(serializers.ModelSerializer):
    """Phase 8: Serializer for focused tasks in personal space."""
    task_data = TaskSerializer(source='task', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    project_name = serializers.CharField(source='task.project.name', read_only=True)
    project_id = serializers.IntegerField(source='task.project.id', read_only=True)
    
    class Meta:
        model = FocusedTask
        fields = [
            'id', 'user', 'task', 'task_data', 'task_title', 'project_name', 'project_id',
            'focused_at', 'notes'
        ]
        read_only_fields = ['id', 'focused_at', 'task_data', 'task_title', 'project_name', 'project_id']


class AddProjectMemberByUsernameSerializer(serializers.Serializer):
    """Phase 8: Serializer for adding members by username with autocomplete."""
    username = serializers.CharField(max_length=30)
    role = serializers.ChoiceField(choices=ProjectRole.ROLE_CHOICES, default=ProjectRole.MEMBER)
    
    def validate_username(self, value):
        try:
            User.objects.get(username__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this username does not exist.")
        return value
    
    def validate(self, data):
        project = self.context.get('project')
        username = data.get('username')
        
        user = User.objects.get(username__iexact=username)
        if ProjectRole.objects.filter(user=user, project=project).exists():
            raise serializers.ValidationError(
                {"username": f"@{username} is already a member of this project."}
            )
        
        return data
