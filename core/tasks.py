"""
Celery configuration and async task definitions.
Handles background jobs, notifications, and automation workflows.
"""
import os
from celery import Celery
from celery.schedules import crontab
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'navflow.settings')

app = Celery('navflow')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


# ================================
# Periodic Tasks (Scheduled)
# ================================

@app.task(bind=True)
def send_daily_digest(self):
    """Send daily digest email to all users with pending tasks."""
    from projects.models import Task
    from accounts.models import CustomUser
    from core.services import TaskService
    
    users = CustomUser.objects.filter(notification_email=True, is_deleted=False)
    
    for user in users:
        tasks = TaskService.get_user_tasks(user, days_ahead=1)
        
        if tasks.exists():
            task_list = '\n'.join([f"- {t.title} (Due: {t.due_date})" for t in tasks])
            
            send_mail(
                subject=f"Your Daily Task Digest - {timezone.now().strftime('%B %d')}",
                message=f"You have {tasks.count()} tasks due today:\n\n{task_list}",
                from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@navflow.app'),
                recipient_list=[user.email],
                fail_silently=True,
            )


@app.task(bind=True)
def find_and_notify_overdue_tasks(self):
    """Find overdue tasks and notify assignees."""
    from projects.models import Task, Notification
    from orgs.models import Organization
    from core.services import TaskService
    
    organizations = Organization.objects.all()
    
    for org in organizations:
        overdue_tasks = TaskService.get_overdue_tasks(org)
        
        for task in overdue_tasks:
            if task.assigned_to and task.assigned_to.notification_email:
                # Create notification
                Notification.objects.get_or_create(
                    user=task.assigned_to,
                    task=task,
                    notification_type='overdue',
                    defaults={'message': f"Task '{task.title}' is overdue"}
                )
                
                # Send email
                send_mail(
                    subject=f"Overdue Task: {task.title}",
                    message=f"The task '{task.title}' is now overdue. Please take action.",
                    from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@navflow.app'),
                    recipient_list=[task.assigned_to.email],
                    fail_silently=True,
                )


@app.task(bind=True)
def cleanup_soft_deleted_records(self):
    """Permanently delete soft-deleted records older than 30 days."""
    from django.db.models import Q
    from projects.models import Task
    from accounts.models import CustomUser
    
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Delete soft-deleted tasks
    Task.objects.filter(
        is_deleted=True,
        deleted_at__lt=cutoff_date
    ).hard_delete()
    
    # Delete soft-deleted users
    CustomUser.objects.filter(
        is_deleted=True,
        deleted_at__lt=cutoff_date
    ).delete()


@app.task(bind=True)
def generate_organization_report(self, org_id: int):
    """Generate comprehensive organization report."""
    from orgs.models import Organization
    from core.services import OrganizationService
    import json
    
    try:
        org = Organization.objects.get(id=org_id)
        analytics = OrganizationService.get_organization_analytics(org)
        
        # Store report (can be extended to PDF export)
        # For now, just log it
        print(f"Organization Report for {org.name}: {json.dumps(analytics, indent=2)}")
        
    except Organization.DoesNotExist:
        print(f"Organization {org_id} not found")


# ================================
# On-Demand Tasks
# ================================

@app.task(bind=True)
def send_task_assigned_notification(self, task_id: int):
    """Send notification when task is assigned."""
    from projects.models import Task, Notification
    
    try:
        task = Task.objects.get(id=task_id)
        
        if task.assigned_to and task.assigned_to.notification_email:
            # Create notification
            Notification.objects.create(
                user=task.assigned_to,
                task=task,
                notification_type='assigned',
                message=f"You've been assigned to '{task.title}'"
            )
            
            # Send email
            send_mail(
                subject=f"New Task Assigned: {task.title}",
                message=f"You've been assigned to task: {task.title}\n\nPriority: {task.priority}\nDue: {task.due_date}",
                from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@navflow.app'),
                recipient_list=[task.assigned_to.email],
                fail_silently=True,
            )
    
    except Task.DoesNotExist:
        pass


@app.task(bind=True)
def send_project_invitation_email(self, membership_id: int):
    """Send email invitation to join project."""
    from orgs.models import Membership
    
    try:
        membership = Membership.objects.get(id=membership_id)
        
        message = f"""
        You've been invited to join {membership.organization.name} on NavFlow!
        
        Role: {membership.get_role_display()}
        
        Click the link below to accept the invitation:
        {os.getenv('FRONTEND_URL')}/organizations/{membership.organization.id}/join
        """
        
        send_mail(
            subject=f"Invitation to join {membership.organization.name}",
            message=message,
            from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@navflow.app'),
            recipient_list=[membership.user.email],
            fail_silently=True,
        )
    
    except Membership.DoesNotExist:
        pass


@app.task(bind=True)
def bulk_export_tasks(self, project_id: int, user_id: int, format_type: str = 'csv'):
    """Generate bulk task export (CSV/Excel)."""
    from projects.models import Task
    from accounts.models import CustomUser
    import csv
    
    try:
        user = CustomUser.objects.get(id=user_id)
        tasks = Task.objects.filter(project_id=project_id)
        
        # Generate CSV
        if format_type == 'csv':
            filename = f"tasks_export_{project_id}_{timezone.now().timestamp()}.csv"
            # Implementation would write to storage and send email link
            
            send_mail(
                subject="Your task export is ready",
                message=f"Your export is ready: {filename}",
                from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@navflow.app'),
                recipient_list=[user.email],
                fail_silently=True,
            )
    
    except Exception as e:
        print(f"Export failed: {str(e)}")


# ================================
# Celery Beat Schedule
# ================================

from celery.schedules import crontab

app.conf.beat_schedule = {
    'send-daily-digest': {
        'task': 'core.tasks.send_daily_digest',
        'schedule': crontab(hour=9, minute=0),  # 9 AM daily
    },
    'find-overdue-tasks': {
        'task': 'core.tasks.find_and_notify_overdue_tasks',
        'schedule': crontab(minute=0),  # Every hour
    },
    'cleanup-deleted-records': {
        'task': 'core.tasks.cleanup_soft_deleted_records',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}
