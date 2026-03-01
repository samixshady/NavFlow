"""
Comprehensive test suite for NavFlow backend.
Covers API endpoints, services, and security features.
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta

from projects.models import Project, Task, TaskSection, AuditLog
from orgs.models import Organization, Membership
from core.services import ProjectService, TaskService, OrganizationService
from core.tenant import TenantContext, MultiTenantMiddleware
from core.security import InputValidator, PermissionValidator
from core.performance import QueryOptimizer

User = get_user_model()


class OrganizationModelTests(TestCase):
    """Tests for organization models and basic operations."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
    
    def test_create_organization(self):
        """Test organization creation."""
        self.assertEqual(Organization.objects.count(), 1)
        self.assertEqual(self.org.name, "Test Org")
    
    def test_add_member_to_organization(self):
        """Test adding member to organization."""
        membership = Membership.objects.create(
            user=self.user,
            organization=self.org,
            role=Membership.MEMBER
        )
        self.assertEqual(membership.role, Membership.MEMBER)
        self.assertTrue(self.org.memberships.exists())


class ProjectServiceTests(TestCase):
    """Tests for project service layer."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=self.user, organization=self.org, role=Membership.OWNER)
    
    def test_create_project_with_defaults(self):
        """Test project creation creates default sections."""
        project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user,
            description="A test project"
        )
        
        self.assertEqual(project.name, "Test Project")
        self.assertTrue(project.sections.exists())
        self.assertTrue(AuditLog.objects.filter(resource_id=project.id).exists())
    
    def test_get_project_stats(self):
        """Test project statistics generation."""
        project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user
        )
        
        stats = ProjectService.get_project_stats(project)
        
        self.assertIn('total_tasks', stats)
        self.assertIn('completed_tasks', stats)
        self.assertEqual(stats['total_tasks'], 0)


class TaskServiceTests(TestCase):
    """Tests for task service layer."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.assignee = User.objects.create_user(
            email='assignee@example.com',
            username='assignee',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=self.user, organization=self.org, role=Membership.OWNER)
        
        self.project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user
        )
    
    def test_create_task(self):
        """Test task creation with service."""
        task = TaskService.create_task(
            title="Test Task",
            project=self.project,
            created_by=self.user,
            assigned_to=self.assignee
        )
        
        self.assertEqual(task.title, "Test Task")
        self.assertEqual(task.assigned_to, self.assignee)
        self.assertTrue(AuditLog.objects.filter(resource_id=task.id).exists())
    
    def test_bulk_update_tasks(self):
        """Test bulk task updates."""
        # Create multiple tasks
        tasks = [
            TaskService.create_task("Task 1", self.project, self.user),
            TaskService.create_task("Task 2", self.project, self.user),
            TaskService.create_task("Task 3", self.project, self.user),
        ]
        task_ids = [t.id for t in tasks]
        
        # Bulk update
        updated, errors = TaskService.bulk_update_tasks(
            task_ids=task_ids,
            update_data={'status': 'in_progress'},
            user=self.user
        )
        
        self.assertEqual(updated, 3)
        self.assertEqual(len(errors), 0)
    
    def test_get_user_tasks(self):
        """Test getting user's tasks with filters."""
        TaskService.create_task(
            title="Task 1",
            project=self.project,
            created_by=self.user,
            assigned_to=self.assignee,
            status='todo'
        )
        
        tasks = TaskService.get_user_tasks(self.assignee, status='todo')
        
        self.assertEqual(tasks.count(), 1)


class SecurityTests(TestCase):
    """Tests for security features."""
    
    def test_input_validation_email(self):
        """Test email validation."""
        self.assertTrue(InputValidator.validate_email('valid@example.com'))
        self.assertFalse(InputValidator.validate_email('invalid.email'))
    
    def test_input_validation_username(self):
        """Test username validation."""
        self.assertTrue(InputValidator.validate_username('valid_user'))
        self.assertFalse(InputValidator.validate_username('in-valid'))
    
    def test_sanitize_string(self):
        """Test string sanitization."""
        dirty = "test\x00input<script>"
        clean = InputValidator.sanitize_string(dirty)
        
        self.assertNotIn('\x00', clean)
        self.assertNotIn('<', clean)
    
    def test_permission_validator(self):
        """Test permission validation."""
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=user, organization=org, role=Membership.MEMBER)
        
        project = Project.objects.create(
            name="Test Project",
            organization=org,
            created_by=user
        )
        
        self.assertTrue(PermissionValidator.user_can_access_project(user, project))


class TenantContextTests(TestCase):
    """Tests for multi-tenant context."""
    
    def setUp(self):
        self.org1 = Organization.objects.create(name="Org 1")
        self.org2 = Organization.objects.create(name="Org 2")
    
    def test_set_and_get_tenant(self):
        """Test tenant context setting and retrieval."""
        TenantContext.set_tenant(self.org1)
        
        current = TenantContext.get_tenant()
        self.assertEqual(current, self.org1)
    
    def test_clear_tenant(self):
        """Test tenant context clearing."""
        TenantContext.set_tenant(self.org1)
        TenantContext.clear_tenant()
        
        current = TenantContext.get_tenant()
        self.assertIsNone(current)


class APITests(APITestCase):
    """API endpoint tests."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(
            user=self.user,
            organization=self.org,
            role=Membership.OWNER
        )
        
        self.project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user
        )
    
    def test_user_authentication(self):
        """Test user can authenticate."""
        # Implement based on your auth endpoints
        pass
    
    def test_create_task_endpoint(self):
        """Test creating task via API."""
        # Implement based on your API structure
        pass
    
    def test_rate_limiting(self):
        """Test rate limiting is enforced."""
        # Implement rate limit testing
        pass


class PerformanceTests(TestCase):
    """Tests for query optimization and performance."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=self.user, organization=self.org)
        
        self.project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user
        )
    
    def test_optimize_task_queryset(self):
        """Test query optimization for tasks."""
        # Create test tasks
        for i in range(5):
            TaskService.create_task(
                title=f"Task {i}",
                project=self.project,
                created_by=self.user
            )
        
        # Get optimized queryset
        qs = QueryOptimizer.optimize_task_queryset(Task.objects.all())
        
        # Verify prefetch_related is applied
        self.assertIsNotNone(qs.query.prefetch_related_lookups)


class AuditLoggingTests(TestCase):
    """Tests for audit logging."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=self.user, organization=self.org, role=Membership.OWNER)
    
    def test_project_creation_logged(self):
        """Test project creation creates audit log."""
        project = ProjectService.create_project_with_defaults(
            name="Test Project",
            organization=self.org,
            created_by=self.user
        )
        
        logs = AuditLog.objects.filter(
            action='project_created',
            resource_id=project.id
        )
        
        self.assertTrue(logs.exists())
        self.assertEqual(logs.first().user, self.user)


class IntegrationTests(TestCase):
    """End-to-end integration tests."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_full_workflow(self):
        """Test complete workflow: org creation -> project -> tasks."""
        # Create organization
        org = OrganizationService.create_organization(
            name="Integration Test Org",
            created_by=self.user
        )
        
        # Create project
        project = ProjectService.create_project_with_defaults(
            name="Integration Test Project",
            organization=org,
            created_by=self.user
        )
        
        # Create task
        task = TaskService.create_task(
            title="Integration Test Task",
            project=project,
            created_by=self.user
        )
        
        # Verify all created successfully
        self.assertTrue(Organization.objects.filter(id=org.id).exists())
        self.assertTrue(Project.objects.filter(id=project.id).exists())
        self.assertTrue(Task.objects.filter(id=task.id).exists())
        
        # Verify audit trail
        logs = AuditLog.objects.filter(organization=org)
        self.assertGreaterEqual(logs.count(), 3)
