"""
AI Integration module for smart features.
Includes task summarization, smart scheduling, and recommendations.
"""
import os
import json
from typing import List, Dict, Optional
from functools import lru_cache
from django.core.cache import cache
from datetime import timedelta
from django.utils import timezone

# OpenAI integration (or similar AI service)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class AIService:
    """Service for AI-powered features."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if OPENAI_AVAILABLE and self.api_key:
            openai.api_key = self.api_key
    
    def summarize_tasks(self, tasks: List, max_length: int = 200) -> str:
        """
        Summarize multiple tasks using AI.
        Returns a concise summary of task list.
        """
        if not OPENAI_AVAILABLE or not self.api_key:
            return self._fallback_summarize(tasks)
        
        try:
            task_descriptions = '\n'.join([
                f"- {t.title}: {t.description[:100] if t.description else ''}"
                for t in tasks[:10]  # Limit to first 10
            ])
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a project management assistant. Summarize the following tasks concisely."
                    },
                    {
                        "role": "user",
                        "content": f"Summarize these tasks:\n{task_descriptions}"
                    }
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            print(f"AI summarization failed: {str(e)}")
            return self._fallback_summarize(tasks)
    
    def generate_task_description(self, title: str) -> str:
        """
        Generate a task description based on title using AI.
        """
        if not OPENAI_AVAILABLE or not self.api_key:
            return ""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a project manager. Generate a brief, actionable task description."
                    },
                    {
                        "role": "user",
                        "content": f"Generate a description for this task: {title}"
                    }
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            print(f"Description generation failed: {str(e)}")
            return ""
    
    def estimate_effort(self, task_title: str, task_description: str = "") -> Dict:
        """
        Estimate task effort (time, complexity, priority) using AI.
        Returns: {hours: int, complexity: str, priority: str}
        """
        if not OPENAI_AVAILABLE or not self.api_key:
            return {"hours": 4, "complexity": "medium", "priority": "medium"}
        
        try:
            prompt = f"Task: {task_title}\nDescription: {task_description}\n\nEstimate:"
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a project estimator. 
                        Respond in JSON format: 
                        {"hours": number, "complexity": "low|medium|high", "priority": "low|medium|high"}"""
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.5
            )
            
            # Parse JSON response
            response_text = response.choices[0].message.content
            estimation = json.loads(response_text)
            return estimation
        
        except Exception as e:
            print(f"Effort estimation failed: {str(e)}")
            return {"hours": 4, "complexity": "medium", "priority": "medium"}
    
    def recommend_task_priority(self, task) -> str:
        """
        Recommend task priority based on due date, dependencies, etc.
        """
        days_until_due = (task.due_date - timezone.now()).days if task.due_date else 30
        
        if days_until_due <= 1:
            return 'critical'
        elif days_until_due <= 3:
            return 'high'
        elif days_until_due <= 7:
            return 'medium'
        else:
            return 'low'
    
    def suggest_task_assignment(self, task) -> Optional[Dict]:
        """
        Suggest team member to assign task based on:
        - Workload
        - Skills/expertise
        - Past assignment patterns
        """
        from projects.models import Task
        from django.db.models import Count
        
        org = task.project.organization
        members = org.memberships.all()
        
        # Count current assigned tasks per member
        workload = {}
        for member in members:
            count = Task.objects.filter(
                assigned_to=member.user,
                project__organization=org,
                status__in=['todo', 'in_progress']
            ).count()
            workload[member.user.id] = count
        
        # Suggest member with least tasks
        if workload:
            suggested_user_id = min(workload, key=workload.get)
            suggested_member = members.get(user_id=suggested_user_id)
            return {
                'user_id': suggested_user_id,
                'username': suggested_member.user.username,
                'current_tasks': workload[suggested_user_id]
            }
        
        return None
    
    def generate_sprint_recommendations(self, organization, sprint_duration_days: int = 14) -> Dict:
        """
        Generate AI-powered sprint recommendations.
        Suggests task grouping, priorities, and team assignments.
        """
        from projects.models import Task
        from core.services import TaskService
        
        # Get upcoming tasks
        tasks = Task.objects.filter(
            project__organization=organization,
            status__in=['todo', 'in_progress'],
            is_deleted=False,
            due_date__lte=timezone.now() + timedelta(days=sprint_duration_days)
        ).select_related('project', 'assigned_to')
        
        recommendations = {
            'total_tasks': tasks.count(),
            'high_priority_tasks': tasks.filter(priority__in=['critical', 'high']).count(),
            'overdue_tasks': tasks.filter(
                due_date__lt=timezone.now(),
                status__in=['todo', 'in_progress']
            ).count(),
            'team_capacity': organization.memberships.count(),
            'suggested_focus': "Complete overdue tasks first, then high-priority items",
        }
        
        return recommendations
    
    def _fallback_summarize(self, tasks) -> str:
        """Fallback summarization without AI."""
        if not tasks:
            return "No tasks to summarize"
        
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == 'done')
        in_progress = sum(1 for t in tasks if t.status == 'in_progress')
        
        return f"Total: {total} tasks | Completed: {completed} | In Progress: {in_progress}"


class SmartNotificationService:
    """Generate smart notifications based on task context."""
    
    @staticmethod
    def get_notification_priority(task) -> str:
        """
        Determine notification priority based on task properties.
        """
        from django.utils import timezone
        
        if task.priority == 'critical':
            return 'high'
        
        days_until_due = (task.due_date - timezone.now()).days if task.due_date else 30
        if days_until_due <= 1:
            return 'high'
        
        return 'normal'
    
    @staticmethod
    def should_send_notification(task, user, last_notification_time) -> bool:
        """
        Determine if notification should be sent to avoid notification fatigue.
        """
        time_since_last = timezone.now() - last_notification_time
        
        # Don't send if notified within last 30 minutes
        if time_since_last < timedelta(minutes=30):
            return False
        
        # High priority tasks can have more frequent notifications
        if task.priority == 'critical':
            return time_since_last > timedelta(minutes=5)
        
        return True


class WorkflowAutomation:
    """Automation rules for workflows."""
    
    @staticmethod
    def auto_move_to_done(task) -> bool:
        """
        Auto-complete task if all subtasks are done.
        """
        from projects.models import Task
        
        incomplete_subtasks = task.subtasks.exclude(status='done').count()
        
        if incomplete_subtasks == 0 and task.subtasks.exists():
            task.status = 'done'
            task.save()
            return True
        
        return False
    
    @staticmethod
    def auto_escalate_priority(task) -> bool:
        """
        Auto-escalate priority based on due date proximity.
        """
        from django.utils import timezone
        
        if task.priority == 'critical':
            return False
        
        days_until_due = (task.due_date - timezone.now()).days if task.due_date else 30
        
        if days_until_due <= 1:
            task.priority = 'critical'
            task.save()
            return True
        elif days_until_due <= 3 and task.priority != 'high':
            task.priority = 'high'
            task.save()
            return True
        
        return False
    
    @staticmethod
    def auto_assign_based_on_workload(task) -> bool:
        """
        Auto-assign task to least busy team member if unassigned.
        """
        from django.db.models import Count
        
        if task.assigned_to:
            return False  # Already assigned
        
        org_members = task.project.organization.memberships.all()
        
        # Find member with least tasks
        member_workload = {}
        for member in org_members:
            from projects.models import Task
            count = Task.objects.filter(
                assigned_to=member.user,
                status__in=['todo', 'in_progress']
            ).count()
            member_workload[member.id] = (member.user, count)
        
        if member_workload:
            best_member, _ = min(member_workload.values(), key=lambda x: x[1])
            task.assigned_to = best_member
            task.save()
            return True
        
        return False
