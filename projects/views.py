from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from .models import Project, Task, ProjectRole, AuditLog, TaskSection
from .serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    TaskSerializer,
    ProjectRoleSerializer,
    AddProjectMemberSerializer,
    AuditLogSerializer,
    TaskSectionSerializer
)
from .permissions import (
    IsProjectMember,
    IsProjectOwner,
    IsProjectOwnerOrAdmin,
    IsProjectOwnerAdminOrModerator,
    CanManageTasks
)
from .services import TaskService, ProjectService
from orgs.models import Membership
from accounts.models import Notification

User = get_user_model()


# Phase 5: Standard pagination for list views
class StandardPagination(PageNumberPagination):
    """Phase 5: Pagination with 25 items per page."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing projects with role-based permissions.
    Phase 5: Added pagination and filtering
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination  # Phase 5: Add pagination
    # Phase 5: Add filtering backends
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['organization_id', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return only projects in organizations where user is a member.
        """
        user = self.request.user
        # Get all org IDs where user is a member
        org_ids = Membership.objects.filter(user=user).values_list('organization_id', flat=True)
        # Get all projects in those orgs where user is a project member
        return Project.objects.filter(
            roles__user=user
        ).select_related('organization', 'created_by').distinct()
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve/create, list for list."""
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectDetailSerializer
    
    def get_serializer_context(self):
        """Add user to context."""
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Create a new project in the user's organization.
        User must be in the organization.
        """
        org_id = request.data.get('organization_id')
        if not org_id:
            return Response(
                {'detail': 'organization_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is in the organization
        try:
            org_membership = Membership.objects.get(
                user=request.user,
                organization_id=org_id
            )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You must be a member of the organization to create a project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create project
        project = Project.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            organization_id=org_id,
            created_by=request.user
        )
        
        # Add creator as owner
        ProjectRole.objects.create(
            user=request.user,
            project=project,
            role=ProjectRole.OWNER
        )
        
        # Phase 7: Create default sections for the project
        TaskSection.create_default_sections(project, request.user)
        
        return Response(
            ProjectDetailSerializer(project, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update project - only owner/admin can update."""
        project = self.get_object()
        
        # Check permission
        self.check_object_permissions(request, project)
        if not (IsProjectOwnerOrAdmin().has_object_permission(request, self, project)):
            return Response(
                {'detail': 'Only project owners and admins can update projects'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete project - only owner can delete."""
        project = self.get_object()
        
        if not (IsProjectOwner().has_object_permission(request, self, project)):
            return Response(
                {'detail': 'Only project owner can delete the project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
        Add a member to the project.
        Only owner and admin can add members.
        """
        project = self.get_object()
        
        # Check if user can assign roles
        try:
            user_role = ProjectRole.objects.get(user=request.user, project=project)
            if user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN]:
                return Response(
                    {'detail': 'Only project owners and admins can add members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ProjectRole.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AddProjectMemberSerializer(
            data=request.data,
            context={'project': project}
        )
        serializer.is_valid(raise_exception=True)
        
        user = User.objects.get(email=serializer.validated_data['email'])
        
        # Check if user is in the organization
        if not Membership.objects.filter(
            user=user,
            organization=project.organization
        ).exists():
            return Response(
                {'detail': 'User must be a member of the project organization'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_role = ProjectRole.objects.create(
            user=user,
            project=project,
            role=serializer.validated_data['role']
        )
        
        return Response(
            ProjectRoleSerializer(new_role).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a project."""
        project = self.get_object()
        
        # Check if user is a member
        if not ProjectRole.objects.filter(user=request.user, project=project).exists():
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        roles = project.roles.all()
        serializer = ProjectRoleSerializer(roles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """
        Remove a member from the project.
        Only owner can remove members.
        """
        project = self.get_object()
        
        if not (IsProjectOwner().has_object_permission(request, self, project)):
            return Response(
                {'detail': 'Only project owner can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        if not email:
            return Response(
                {'detail': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            role = ProjectRole.objects.get(user=user, project=project)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ProjectRole.DoesNotExist:
            return Response(
                {'detail': 'User is not a member of this project'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if role.role == ProjectRole.OWNER:
            return Response(
                {'detail': 'Cannot remove the project owner'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        role.delete()
        return Response({'detail': 'Member removed successfully'}, status=status.HTTP_200_OK)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks with role-based permissions.
    Phase 4: Soft delete support, Phase 5: Pagination & filtering
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination  # Phase 5: Add pagination
    # Phase 5: Add filtering backends
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project_id', 'assigned_to', 'status', 'priority']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Phase 4: Return only active (non-deleted) tasks in projects where user is a member.
        """
        user = self.request.user
        # Phase 4: Only return non-deleted tasks
        return Task.get_active().filter(
            project__roles__user=user
        ).select_related('project', 'assigned_to', 'created_by').distinct()
    
    def create(self, request, *args, **kwargs):
        """
        Phase 4: Create task using service layer with validation and audit logging.
        Only moderators and higher can create tasks.
        """
        project_id = request.data.get('project_id')
        if not project_id:
            return Response(
                {'detail': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'detail': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Phase 4: Use service layer for validation and creation
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            task = TaskService.create_task(
                user=request.user,
                project=project,
                title=serializer.validated_data['title'],
                description=serializer.validated_data.get('description', ''),
                priority=serializer.validated_data.get('priority', 'medium'),
                status=serializer.validated_data.get('status', 'todo'),
                assigned_to=serializer.validated_data.get('assigned_to'),
                due_date=serializer.validated_data.get('due_date')
            )
            
            # Phase 7: Send notification if task is assigned to someone
            assigned_to = serializer.validated_data.get('assigned_to')
            if assigned_to and assigned_to != request.user:
                Notification.objects.create(
                    user=assigned_to,
                    type='task_assigned',
                    title='New Task Assigned',
                    message=f'You have been assigned to "{task.title}" in {project.name}',
                    link=f'/tasks?task={task.id}',
                    related_task_id=task.id,
                    related_project_id=project.id,
                    actor_id=request.user.id,
                    actor_name=request.user.get_full_name()
                )
            
            return Response(
                TaskSerializer(task).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def update(self, request, *args, **kwargs):
        """Phase 4: Update task via service layer with audit logging."""
        task = self.get_object()
        old_assigned_to = task.assigned_to
        
        try:
            # Phase 4: Use service layer for validation
            update_data = {}
            for field in ['title', 'description', 'status', 'priority', 'assigned_to', 'due_date', 'section']:
                if field in request.data:
                    update_data[field] = request.data[field]
            
            if update_data:
                TaskService.update_task(request.user, task, **update_data)
            
            # Phase 7: Send notification if assignee changed
            new_assigned_to = task.assigned_to
            if new_assigned_to and new_assigned_to != old_assigned_to and new_assigned_to != request.user:
                Notification.objects.create(
                    user=new_assigned_to,
                    type='task_assigned',
                    title='Task Assigned to You',
                    message=f'You have been assigned to "{task.title}" in {task.project.name}',
                    link=f'/tasks?task={task.id}',
                    related_task_id=task.id,
                    related_project_id=task.project.id,
                    actor_id=request.user.id,
                    actor_name=request.user.get_full_name()
                )
            
            return Response(
                TaskSerializer(task).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def destroy(self, request, *args, **kwargs):
        """Phase 4: Soft delete task instead of hard delete, with audit logging."""
        task = self.get_object()
        
        try:
            # Phase 4: Use service layer for soft delete
            TaskService.delete_task(request.user, task)
            return Response(
                {'detail': 'Task deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=True, methods=['post'])
    def start_timer(self, request, pk=None):
        """Phase 6: Start the task timer."""
        task = self.get_object()
        
        # Check if user has permission (assigned to or project member)
        if not ProjectRole.objects.filter(user=request.user, project=task.project).exists():
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.start_timer()
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['post'])
    def stop_timer(self, request, pk=None):
        """Phase 6: Stop the task timer."""
        task = self.get_object()
        
        if not ProjectRole.objects.filter(user=request.user, project=task.project).exists():
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.stop_timer()
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['post'])
    def add_time(self, request, pk=None):
        """Phase 6: Manually add time to a task."""
        task = self.get_object()
        
        if not ProjectRole.objects.filter(user=request.user, project=task.project).exists():
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        minutes = request.data.get('minutes', 0)
        try:
            minutes = int(minutes)
            if minutes < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Minutes must be a positive integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.time_spent_minutes += minutes
        task.save()
        return Response(TaskSerializer(task).data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Phase 6: Reorder tasks for kanban board drag-and-drop."""
        tasks_data = request.data.get('tasks', [])
        
        if not tasks_data:
            return Response(
                {'detail': 'tasks array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate all tasks exist and user has access
        task_ids = [t.get('id') for t in tasks_data]
        user_tasks = Task.get_active().filter(
            id__in=task_ids,
            project__roles__user=request.user
        ).distinct()
        
        if user_tasks.count() != len(task_ids):
            return Response(
                {'detail': 'One or more tasks not found or not accessible'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update positions and statuses
        for task_data in tasks_data:
            task_id = task_data.get('id')
            position = task_data.get('position', 0)
            new_status = task_data.get('status')
            
            task = user_tasks.get(id=task_id)
            task.position = position
            if new_status and new_status in ['todo', 'in_progress', 'review', 'done']:
                old_status = task.status
                task.status = new_status
                # If moved to done, record completion time
                if new_status == 'done' and old_status != 'done':
                    task.completed_at = timezone.now()
                    # Stop timer if running
                    if task.is_timer_running:
                        task.stop_timer()
                elif new_status != 'done' and old_status == 'done':
                    task.completed_at = None
            task.save()
        
        return Response({'detail': 'Tasks reordered successfully'})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Phase 5: Read-only viewset for audit logs. Admin only."""
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['organization_id', 'action', 'content_type', 'user_id']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Phase 5: Only return audit logs for orgs user is a member of."""
        user = self.request.user
        org_ids = Membership.objects.filter(user=user).values_list('organization_id', flat=True)
        return AuditLog.objects.filter(organization_id__in=org_ids)


class TaskSectionViewSet(viewsets.ModelViewSet):
    """
    Phase 7: ViewSet for managing custom task sections.
    Only moderators and above can create/update/delete sections.
    """
    serializer_class = TaskSectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return sections for projects where user is a member."""
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        
        queryset = TaskSection.objects.filter(
            project__roles__user=user
        ).select_related('project').distinct()
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        return queryset.order_by('position')
    
    def create(self, request, *args, **kwargs):
        """Create a new section. Only moderators and above."""
        project_id = request.data.get('project_id')
        if not project_id:
            return Response(
                {'detail': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'detail': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check user has moderator role or higher
        try:
            user_role = ProjectRole.objects.get(user=request.user, project=project)
            if user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]:
                return Response(
                    {'detail': 'Only moderators and above can create sections'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ProjectRole.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the next position
        max_position = TaskSection.objects.filter(project=project).aggregate(
            max_pos=models.Max('position')
        )['max_pos'] or -1
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        section = TaskSection.objects.create(
            project=project,
            name=serializer.validated_data['name'],
            slug=serializer.validated_data.get('slug', ''),
            color=serializer.validated_data.get('color', '#6366f1'),
            icon=serializer.validated_data.get('icon'),
            position=max_position + 1,
            created_by=request.user
        )
        
        return Response(
            TaskSectionSerializer(section).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update section. Only moderators and above."""
        section = self.get_object()
        
        try:
            user_role = ProjectRole.objects.get(user=request.user, project=section.project)
            if user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]:
                return Response(
                    {'detail': 'Only moderators and above can update sections'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ProjectRole.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete section. Cannot delete default sections. Only moderators and above."""
        section = self.get_object()
        
        if section.is_default:
            return Response(
                {'detail': 'Cannot delete default sections'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_role = ProjectRole.objects.get(user=request.user, project=section.project)
            if user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]:
                return Response(
                    {'detail': 'Only moderators and above can delete sections'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ProjectRole.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Move tasks in this section to the first default section
        default_section = TaskSection.objects.filter(
            project=section.project,
            is_default=True
        ).first()
        
        if default_section:
            Task.objects.filter(section=section).update(section=default_section)
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder sections within a project."""
        project_id = request.data.get('project_id')
        sections_order = request.data.get('sections', [])  # [{id: 1, position: 0}, ...]
        
        if not project_id or not sections_order:
            return Response(
                {'detail': 'project_id and sections array required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id)
            user_role = ProjectRole.objects.get(user=request.user, project=project)
            if user_role.role not in [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MODERATOR]:
                return Response(
                    {'detail': 'Only moderators and above can reorder sections'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (Project.DoesNotExist, ProjectRole.DoesNotExist):
            return Response(
                {'detail': 'Project not found or not accessible'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        for section_data in sections_order:
            TaskSection.objects.filter(
                id=section_data['id'],
                project=project
            ).update(position=section_data['position'])
        
        return Response({'detail': 'Sections reordered successfully'})
