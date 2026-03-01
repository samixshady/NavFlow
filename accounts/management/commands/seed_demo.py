"""
Management command to seed demo data into the database.
Creates demo users (owner, admin, moderator, member), an organization,
a project with sections, labels, and sample tasks.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from orgs.models import Organization, Membership, OrgPermissions
from projects.models import Project, ProjectRole, TaskSection, TaskLabel, Task

User = get_user_model()

DEMO_PASSWORD = 'NavFlow123!'

DEMO_USERS = [
    {
        'email': 'owner@demo.com',
        'username': 'owner_demo',
        'first_name': 'Owen',
        'last_name': 'DemoOwner',
        'bio': 'Demo owner account for NavFlow',
        'job_title': 'CEO',
    },
    {
        'email': 'admin@demo.com',
        'username': 'admin_demo',
        'first_name': 'Alice',
        'last_name': 'DemoAdmin',
        'bio': 'Demo admin account for NavFlow',
        'job_title': 'Engineering Manager',
    },
    {
        'email': 'moderator@demo.com',
        'username': 'mod_demo',
        'first_name': 'Mark',
        'last_name': 'DemoMod',
        'bio': 'Demo moderator account for NavFlow',
        'job_title': 'Tech Lead',
    },
    {
        'email': 'user@demo.com',
        'username': 'user_demo',
        'first_name': 'Uma',
        'last_name': 'DemoUser',
        'bio': 'Demo member account for NavFlow',
        'job_title': 'Developer',
    },
]


class Command(BaseCommand):
    help = 'Seed demo users, organization, project, and tasks into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing demo data before seeding',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Resetting demo data...')
            self._reset()

        # 1. Create demo users
        users = {}
        for user_data in DEMO_USERS:
            email = user_data['email']
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': user_data['username'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'bio': user_data.get('bio', ''),
                    'job_title': user_data.get('job_title', ''),
                    'is_active': True,
                }
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'  Created user: {email}'))
            else:
                # Ensure password is correct even if user already existed
                user.set_password(DEMO_PASSWORD)
                user.save()
                self.stdout.write(f'  User already exists: {email} (password reset)')
            users[email] = user

        owner = users['owner@demo.com']
        admin = users['admin@demo.com']
        moderator = users['moderator@demo.com']
        member = users['user@demo.com']

        # Make owner a superuser so they can access Django admin
        if not owner.is_superuser:
            owner.is_superuser = True
            owner.is_staff = True
            owner.save()
            self.stdout.write(self.style.SUCCESS('  Made owner a superuser'))

        # 2. Create demo organization
        org, created = Organization.objects.get_or_create(
            name='NavFlow Demo Org',
            defaults={'description': 'A demo organization to showcase NavFlow features.'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Created organization: {org.name}'))
        else:
            self.stdout.write(f'  Organization already exists: {org.name}')

        # 3. Create memberships
        memberships = [
            (owner, Membership.OWNER),
            (admin, Membership.ADMIN),
            (moderator, Membership.MODERATOR),
            (member, Membership.MEMBER),
        ]
        for user, role in memberships:
            mem, created = Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': role}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Added {user.email} as {role} in {org.name}'))
            else:
                self.stdout.write(f'  Membership exists: {user.email} ({mem.role})')

        # 4. Create org permissions (defaults)
        perms, created = OrgPermissions.objects.get_or_create(organization=org)
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Created default permissions for {org.name}'))

        # 5. Create demo project
        project, created = Project.objects.get_or_create(
            name='NavFlow Demo Project',
            organization=org,
            defaults={
                'description': 'A sample project to explore task management, sections, labels, and more.',
                'created_by': owner,
                'status': 'active',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Created project: {project.name}'))
        else:
            self.stdout.write(f'  Project already exists: {project.name}')

        # 6. Create project roles
        project_roles = [
            (owner, ProjectRole.OWNER),
            (admin, ProjectRole.ADMIN),
            (moderator, ProjectRole.MODERATOR),
            (member, ProjectRole.MEMBER),
        ]
        for user, role in project_roles:
            pr, created = ProjectRole.objects.get_or_create(
                user=user,
                project=project,
                defaults={'role': role}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Project role: {user.email} as {role}'))

        # 7. Create default sections
        if not project.sections.exists():
            TaskSection.create_default_sections(project, owner)
            self.stdout.write(self.style.SUCCESS('  Created default task sections'))
        else:
            self.stdout.write('  Task sections already exist')

        # 8. Create default labels
        labels = TaskLabel.get_default_labels()
        self.stdout.write(self.style.SUCCESS(f'  Ensured {len(labels)} default labels'))

        # 9. Create sample tasks
        sections = {s.slug: s for s in project.sections.all()}
        sample_tasks = [
            {
                'title': 'Set up project repository',
                'description': 'Initialize the Git repository and configure CI/CD pipeline.',
                'status': 'done',
                'priority': 'high',
                'section': sections.get('done'),
                'assigned_to': owner,
                'assigned_to_username': owner.username,
            },
            {
                'title': 'Design database schema',
                'description': 'Create ERD and define all models for the application.',
                'status': 'done',
                'priority': 'high',
                'section': sections.get('done'),
                'assigned_to': admin,
                'assigned_to_username': admin.username,
            },
            {
                'title': 'Implement user authentication',
                'description': 'Build JWT-based auth with login, register, and token refresh.',
                'status': 'review',
                'priority': 'high',
                'section': sections.get('review'),
                'assigned_to': moderator,
                'assigned_to_username': moderator.username,
            },
            {
                'title': 'Build task management API',
                'description': 'CRUD endpoints for tasks with filtering and pagination.',
                'status': 'in_progress',
                'priority': 'medium',
                'section': sections.get('in_progress'),
                'assigned_to': member,
                'assigned_to_username': member.username,
            },
            {
                'title': 'Create organization dashboard',
                'description': 'Frontend dashboard showing org stats, members, and projects.',
                'status': 'in_progress',
                'priority': 'medium',
                'section': sections.get('in_progress'),
                'assigned_to': admin,
                'assigned_to_username': admin.username,
            },
            {
                'title': 'Add notification system',
                'description': 'Real-time notifications for task assignments and updates.',
                'status': 'todo',
                'priority': 'medium',
                'section': sections.get('todo'),
                'assigned_to': moderator,
                'assigned_to_username': moderator.username,
            },
            {
                'title': 'Write API documentation',
                'description': 'Document all endpoints with Swagger/OpenAPI.',
                'status': 'todo',
                'priority': 'low',
                'section': sections.get('todo'),
                'assigned_to': member,
                'assigned_to_username': member.username,
            },
            {
                'title': 'Performance optimization',
                'description': 'Optimize database queries and add caching where needed.',
                'status': 'todo',
                'priority': 'low',
                'section': sections.get('todo'),
                'assigned_to': None,
                'assigned_to_username': None,
            },
        ]

        tasks_created = 0
        for task_data in sample_tasks:
            section = task_data.pop('section', None)
            assigned_to = task_data.pop('assigned_to', None)
            assigned_to_username = task_data.pop('assigned_to_username', None)

            task, created = Task.objects.get_or_create(
                title=task_data['title'],
                project=project,
                defaults={
                    **task_data,
                    'section': section,
                    'assigned_to': assigned_to,
                    'assigned_to_username': assigned_to_username,
                    'created_by': owner,
                }
            )
            if created:
                tasks_created += 1

        self.stdout.write(self.style.SUCCESS(f'  Created {tasks_created} sample tasks'))

        self.stdout.write(self.style.SUCCESS('\n=== Demo data seeding complete! ==='))
        self.stdout.write('Demo accounts:')
        self.stdout.write(f'  Owner:     owner@demo.com     / {DEMO_PASSWORD}')
        self.stdout.write(f'  Admin:     admin@demo.com     / {DEMO_PASSWORD}')
        self.stdout.write(f'  Moderator: moderator@demo.com / {DEMO_PASSWORD}')
        self.stdout.write(f'  Member:    user@demo.com      / {DEMO_PASSWORD}')

    def _reset(self):
        """Delete existing demo data."""
        demo_emails = [u['email'] for u in DEMO_USERS]
        
        # Delete tasks in demo project
        Project.objects.filter(name='NavFlow Demo Project').delete()
        self.stdout.write('  Deleted demo project and tasks')
        
        # Delete org (cascades memberships, invitations, permissions)
        Organization.objects.filter(name='NavFlow Demo Org').delete()
        self.stdout.write('  Deleted demo organization')
        
        # Delete demo users
        User.objects.filter(email__in=demo_emails).delete()
        self.stdout.write('  Deleted demo users')
