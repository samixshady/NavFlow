"""
Service layer for business logic and operations.
Separates complex business logic from views/serializers.
Follows the Single Responsibility Principle.
"""
from typing import List, Dict, Any, Optional, Tuple
from django.db import transaction
from django.db.models import Q, Count, F, QuerySet
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from projects.models import Task, Project, TaskSection, AuditLog
from orgs.models import Organization, Membership
from accounts.models import CustomUser


class ProjectService:
    """Service for project-related operations."""
    
    @staticmethod
    def create_project_with_defaults(
        name: str,
        organization: Organization,
        created_by: CustomUser,
        description: str = "",
        **kwargs
    ) -> Project:
        """
        Create a project with default sections and labels.
        Ensures consistency across project creation.
        """
        with transaction.atomic():
            project = Project.objects.create(
                name=name,
                organization=organization,
                created_by=created_by,
                description=description,
                **kwargs
            )
            
            # Create default task sections
            TaskSection.create_default_sections(project, created_by)
            
            # Log audit event
            AuditLog.objects.create(
                organization=organization,
                user=created_by,
                action='project_created',
                resource_type='Project',
                resource_id=project.id,
                details={'project_name': project.name}
            )
            
            return project
    
    @staticmethod
    def get_project_stats(project: Project) -> Dict[str, Any]:
        """Get comprehensive project statistics."""
        cache_key = f'project_stats_{project.id}'
        stats = cache.get(cache_key)
        
        if stats is None:
            tasks = project.tasks.all()
            stats = {
                'total_tasks': tasks.count(),
                'completed_tasks': tasks.filter(status='done').count(),
                'in_progress_tasks': tasks.filter(status='in_progress').count(),
                'overdue_tasks': tasks.filter(
                    due_date__lt=timezone.now(),
                    status__in=['todo', 'in_progress']
                ).count(),
                'assigned_to_me': tasks.filter(assigned_to=None).count(),
                'completion_percentage': (
                    (tasks.filter(status='done').count() / tasks.count() * 100)
                    if tasks.count() > 0 else 0
                ),
                'team_size': project.organization.memberships.count(),
                'last_activity': tasks.latest('updated_at').updated_at if tasks.exists() else None,
            }
            # Cache for 5 minutes
            cache.set(cache_key, stats, 300)
        
        return stats
    
    @staticmethod
    def archive_project(project: Project, user: CustomUser) -> None:
        """Archive a project and log the action."""
        with transaction.atomic():
            project.is_archived = True
            project.save()
            
            AuditLog.objects.create(
                organization=project.organization,
                user=user,
                action='project_archived',
                resource_type='Project',
                resource_id=project.id,
            )


class TaskService:
    """Service for task-related operations."""
    
    @staticmethod
    @transaction.atomic
    def create_task(
        title: str,
        project: Project,
        created_by: CustomUser,
        section: Optional[TaskSection] = None,
        assigned_to: Optional[CustomUser] = None,
        **kwargs
    ) -> Task:
        """
        Create a task with validation and audit logging.
        """
        task = Task.objects.create(
            title=title,
            project=project,
            section=section or project.sections.first(),
            created_by=created_by,
            assigned_to=assigned_to,
            **kwargs
        )
        
        AuditLog.objects.create(
            organization=project.organization,
            user=created_by,
            action='task_created',
            resource_type='Task',
            resource_id=task.id,
            details={
                'title': task.title,
                'project_id': project.id,
                'assigned_to_username': assigned_to.username if assigned_to else None
            }
        )
        
        return task
    
    @staticmethod
    def bulk_update_tasks(
        task_ids: List[int],
        update_data: Dict[str, Any],
        user: CustomUser
    ) -> Tuple[int, List[str]]:
        """
        Bulk update multiple tasks efficiently.
        Returns: (updated_count, error_messages)
        """
        errors = []
        updated_count = 0
        
        try:
            with transaction.atomic():
                # Validate all tasks exist and user has access
                tasks = Task.objects.filter(id__in=task_ids)
                
                if tasks.count() != len(task_ids):
                    errors.append('Some tasks not found')
                    return 0, errors
                
                # Check authorization
                org_ids = set(tasks.values_list('project__organization_id', flat=True))
                for org_id in org_ids:
                    if not user.memberships.filter(organization_id=org_id).exists():
                        errors.append('Unauthorized: No access to some tasks')
                        return 0, errors
                
                # Perform bulk update
                updated_count = tasks.update(**update_data)
                
                # Log for audit trail
                AuditLog.objects.create(
                    organization_id=list(org_ids)[0],
                    user=user,
                    action='tasks_bulk_updated',
                    resource_type='Task',
                    details={
                        'task_count': updated_count,
                        'update_fields': list(update_data.keys())
                    }
                )
        except Exception as e:
            errors.append(str(e))
        
        return updated_count, errors
    
    @staticmethod
    def get_user_tasks(
        user: CustomUser,
        status: Optional[str] = None,
        organization: Optional[Organization] = None,
        days_ahead: int = 30
    ) -> QuerySet:
        """
        Get tasks for a user with optional filters.
        Optimized with prefetch_related and select_related.
        """
        tasks = Task.objects.filter(
            assigned_to=user
        ).select_related(
            'project',
            'project__organization',
            'created_by',
            'assigned_to'
        ).prefetch_related(
            'labels',
            'subtasks'
        )
        
        if status:
            tasks = tasks.filter(status=status)
        
        if organization:
            tasks = tasks.filter(project__organization=organization)
        
        # Due within X days
        due_date = timezone.now() + timedelta(days=days_ahead)
        tasks = tasks.filter(due_date__lte=due_date)
        
        return tasks.order_by('due_date', 'priority')
    
    @staticmethod
    def get_overdue_tasks(organization: Organization) -> QuerySet:
        """Get all overdue tasks in organization."""
        return Task.objects.filter(
            project__organization=organization,
            due_date__lt=timezone.now(),
            status__in=['todo', 'in_progress'],
            is_deleted=False
        ).select_related(
            'assigned_to',
            'project',
            'created_by'
        ).order_by('due_date')


class OrganizationService:
    """Service for organization management operations."""
    
    @staticmethod
    @transaction.atomic
    def create_organization(
        name: str,
        created_by: CustomUser,
        description: str = ""
    ) -> Organization:
        """Create organization and set creator as owner."""
        organization = Organization.objects.create(
            name=name,
            description=description
        )
        
        # Add creator as owner
        Membership.objects.create(
            user=created_by,
            organization=organization,
            role=Membership.OWNER
        )
        
        AuditLog.objects.create(
            organization=organization,
            user=created_by,
            action='organization_created',
            resource_type='Organization',
            resource_id=organization.id,
            details={'org_name': organization.name}
        )
        
        return organization
    
    @staticmethod
    def get_organization_members(
        organization: Organization,
        role: Optional[str] = None
    ) -> QuerySet:
        """Get organization members with optional role filter."""
        memberships = Membership.objects.filter(
            organization=organization
        ).select_related('user')
        
        if role:
            memberships = memberships.filter(role=role)
        
        return memberships.order_by('-joined_at')
    
    @staticmethod
    def get_organization_analytics(organization: Organization) -> Dict[str, Any]:
        """Get organization-wide analytics."""
        cache_key = f'org_analytics_{organization.id}'
        analytics = cache.get(cache_key)
        
        if analytics is None:
            projects = organization.projects.all()
            tasks = Task.objects.filter(project__organization=organization)
            
            analytics = {
                'total_projects': projects.count(),
                'total_tasks': tasks.count(),
                'total_members': organization.memberships.count(),
                'total_completed_tasks': tasks.filter(status='done').count(),
                'projects_by_status': dict(
                    projects.values('status').annotate(count=Count('id')).values_list('status', 'count')
                ),
                'member_activity': dict(
                    tasks.filter(
                        created_at__gte=timezone.now() - timedelta(days=30)
                    ).values('created_by__username').annotate(
                        task_count=Count('id')
                    ).order_by('-task_count')[:10]
                )
            }
            # Cache for 1 hour
            cache.set(cache_key, analytics, 3600)
        
        return analytics


class UserService:
    """Service for user-related operations."""
    
    @staticmethod
    def get_user_organizations(user: CustomUser) -> QuerySet:
        """Get all organizations user belongs to."""
        return user.memberships.select_related(
            'organization'
        ).order_by('-joined_at')
    
    @staticmethod
    def get_user_dashboard_data(user: CustomUser) -> Dict[str, Any]:
        """Get comprehensive dashboard data for user."""
        orgs = user.memberships.select_related('organization')
        primary_org = orgs.first()
        
        data = {
            'organizations_count': orgs.count(),
            'assigned_tasks': TaskService.get_user_tasks(user, status='in_progress').count(),
            'overdue_tasks': TaskService.get_user_tasks(user).filter(
                due_date__lt=timezone.now()
            ).count(),
            'completed_today': Task.objects.filter(
                assigned_to=user,
                status='done',
                updated_at__date=timezone.now().date()
            ).count(),
        }
        
        if primary_org:
            data['primary_org'] = {
                'id': primary_org.organization.id,
                'name': primary_org.organization.name,
                'role': primary_org.role,
            }
        
        return data
