# NavFlow — Full Project Breakdown for Software Engineer Interview

> **Live Link:** https://nav-flow.vercel.app  
> **Tech Stack:** Django 6 + DRF (Backend) | Next.js 16 + React 19 (Frontend) | PostgreSQL (Database)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Pattern — How Django + Next.js Work Together](#2-architecture-pattern--how-django--nextjs-work-together)
3. [Backend Architecture (Django + DRF)](#3-backend-architecture-django--drf)
4. [Frontend Architecture (Next.js + React)](#4-frontend-architecture-nextjs--react)
5. [Database Design & Models](#5-database-design--models)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Multi-Tenancy Architecture](#7-multi-tenancy-architecture)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Key Features Deep Dive](#9-key-features-deep-dive)
10. [API Design & REST Conventions](#10-api-design--rest-conventions)
11. [Deployment & DevOps](#11-deployment--devops)
12. [Design Patterns Used](#12-design-patterns-used)
13. [Interview Questions & Answers](#13-interview-questions--answers)
14. [Technical Decisions & Trade-offs](#14-technical-decisions--trade-offs)

---

## 1. Project Overview

**NavFlow** is a **multi-tenant project and task management platform** — similar to Jira, Asana, or Linear — that enables teams to collaborate within organizations, manage projects, track tasks with timers, and maintain full audit trails.

### What makes it stand out:
- **Multi-tenant architecture** — Organizations are isolated tenants; all data is scoped to org boundaries
- **Backend-heavy** — Business logic lives in service layers, permission classes, and model constraints (not just CRUD views)
- **RBAC at two levels** — Organization-level roles AND project-level roles with customizable permissions
- **Audit logging** — Every critical action is logged for compliance and traceability
- **Soft deletes** — Users and tasks are soft-deleted with data preservation
- **Real collaboration features** — Invitations, @mentions, comments, notifications, time tracking

### Core Entities:
| Entity | Description |
|--------|-------------|
| **User** | Custom user model with email-based auth + unique username |
| **Organization** | Tenant boundary — groups users and projects |
| **Membership** | Through model linking Users ↔ Organizations with roles |
| **Project** | Belongs to one Organization, has its own role system |
| **Task** | Work item in a project with status, priority, timer, labels |
| **TaskSection** | Custom workflow stages (like Kanban columns) |
| **TaskLabel** | Color-coded labels (scoped to org or project) |
| **TaskComment** | Comments with @mention support |
| **AuditLog** | Records every action for traceability |
| **Notification** | System notifications for assignments, invites, etc. |
| **FocusedTask** | Personal focus mode for individual productivity |
| **Invitation** | Username-based org invitations with accept/decline flow |

---

## 2. Architecture Pattern — How Django + Next.js Work Together

### This is NOT MVC or MVT in the traditional sense. Here's what it actually is:

### Overall Pattern: **Decoupled Client-Server Architecture (REST API + SPA)**

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
│                                                                      │
│  ┌───────────┐   ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │   Pages   │──▶│Components│──▶ │  Zustand  │──▶│  Axios API   │  │
│  │ (app dir) │   │  (React) │    │  (Store)  │   │  Client      │  │
│  └───────────┘   └──────────┘    └──────────┘    └──────┬───────┘  │
│                                                          │          │
└──────────────────────────────────────────────────────────┼──────────┘
                                                           │
                                              REST API (JSON) + JWT
                                                           │
┌──────────────────────────────────────────────────────────┼──────────┐
│                        BACKEND (Django + DRF)            │          │
│                                                          ▼          │
│  ┌───────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐  │
│  │   URLs    │──▶│   ViewSets   │──▶│ Services │──▶│  Models   │  │
│  │ (Router)  │   │ (Controllers)│   │  (Logic) │   │   (ORM)   │  │
│  └───────────┘   └──────┬───────┘   └──────────┘   └─────┬────┘  │
│                          │                                 │       │
│                  ┌───────▼───────┐                  ┌──────▼────┐  │
│                  │  Serializers  │                  │ PostgreSQL │  │
│                  │ (Validation)  │                  │ (Database) │  │
│                  └───────────────┘                  └───────────┘  │
│                                                                     │
│                  ┌───────────────┐                                  │
│                  │  Permissions  │  (RBAC enforcement)              │
│                  └───────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Why it's NOT traditional MVC/MVT:

| Pattern | Description | NavFlow? |
|---------|-------------|----------|
| **MVC** (Model-View-Controller) | View = UI rendering, Controller = request handling, Model = data | ❌ Django doesn't render HTML for frontend |
| **MVT** (Model-View-Template) | Django's default: Template renders HTML, View handles logic | ❌ No Django templates used at all |
| **REST API + SPA** | Backend is a stateless JSON API, frontend is a separate app | ✅ **This is NavFlow** |

### Django Side — Layered Architecture:

```
Request Flow:
URL Router → ViewSet → Permission Check → Serializer (validation) → Service Layer → Model (ORM) → Database → Serializer (output) → JSON Response
```

- **URLs/Router** — Maps HTTP endpoints to ViewSets (using DRF's `DefaultRouter`)
- **ViewSets** — Handle HTTP methods (GET, POST, PUT, DELETE), act as controllers
- **Serializers** — Validate input data AND format output data (bidirectional), like DTOs
- **Services** — Business logic layer (`TaskService`, `ProjectService`) encapsulating rules
- **Permissions** — Custom DRF permission classes enforcing RBAC at the API layer
- **Models** — ORM layer with data integrity constraints, model-level validation (`clean()`)

### Next.js Side — Component-Based Architecture:

```
Page (app/page.tsx) → Layout (shared chrome) → Components (UI) → Store (Zustand) → API Layer (Axios)
```

- **App Router** (`app/` directory) — File-based routing with layouts
- **Components** — Reusable React components (`Sidebar`, `Navbar`, `DashboardLayout`)
- **Zustand Store** — Client-side state management for auth (`useAuthStore`)
- **API Layer** (`lib/api.ts`) — Axios instance with JWT interceptors and automatic token refresh
- **Providers** — React Query (`QueryClientProvider`) for server state caching
- **Theme Context** — Dark/light mode with `localStorage` persistence

### How They Communicate:

1. **Frontend** makes HTTP requests via Axios to `NEXT_PUBLIC_API_BASE_URL`
2. **JWT tokens** (`access_token`, `refresh_token`) are stored in `localStorage`
3. Every request includes `Authorization: Bearer <access_token>` header
4. On 401 response → Axios interceptor automatically refreshes the token
5. **CORS** is configured on Django to allow requests from the frontend origin
6. **No server-side rendering** of data — all data fetching is client-side (`'use client'` pages)

---

## 3. Backend Architecture (Django + DRF)

### Django Apps Structure:

```
navflow/          → Project settings, root URLs, WSGI/ASGI config
accounts/         → Custom User model, auth views, notifications, profile
orgs/             → Organizations, Memberships, Invitations, OrgPermissions
projects/         → Projects, Tasks, Sections, Labels, Comments, AuditLog, Focus
core/             → Health check endpoint, landing
```

### Key Django Concepts Used:

| Concept | How It's Used |
|---------|---------------|
| **Custom User Model** | `AbstractUser` extended with email login, profile fields, soft delete |
| **Custom Manager** | `CustomUserManager` — login by email OR username via `get_by_natural_key()` |
| **Through Model** | `Membership` is the explicit through model for User ↔ Organization M2M |
| **Model Validation** | `clean()` methods enforce business rules (e.g., one owner per org) |
| **Signals (implicit)** | `save()` overrides handle slug generation, @mention extraction |
| **Soft Deletes** | `deleted_at` field + `get_active()` queryset filter |
| **Database Indexes** | Composite indexes for performance on frequent query patterns |
| **Unique Constraints** | `unique_together` and `UniqueConstraint` for data integrity |

### DRF (Django REST Framework) Concepts:

| Concept | How It's Used |
|---------|---------------|
| **ViewSets** | `ModelViewSet` for full CRUD + custom `@action` decorators |
| **Serializers** | Input validation, output formatting, nested serializers |
| **Permission Classes** | 6+ custom permissions (`IsProjectMember`, `CanManageTasks`, etc.) |
| **Router** | `DefaultRouter` auto-generates URL patterns for ViewSets |
| **Pagination** | `PageNumberPagination` with configurable page size (25 default) |
| **Filtering** | `DjangoFilterBackend`, `SearchFilter`, `OrderingFilter` |
| **Token Auth** | `JWTAuthentication` via SimpleJWT |
| **OpenAPI/Swagger** | `drf-spectacular` auto-generates API docs at `/api/docs/` |

### Service Layer Pattern:

The project uses a **Service Layer** to separate business logic from views:

```python
# services.py — Business logic is HERE, not in views
class TaskService:
    @staticmethod
    def create_task(user, project, title, ...):
        TaskService.can_create_task(user, project)   # Permission check
        task = Task.objects.create(...)                # Create
        AuditLog.objects.create(...)                   # Audit trail
        return task
    
    @staticmethod
    def can_create_task(user, project):
        role = ProjectRole.objects.filter(user=user, project=project).first()
        if role.role not in ['owner', 'admin', 'moderator']:
            raise ValidationError("Only moderators and above can create tasks.")
```

**Why this matters in an interview:**
- Shows separation of concerns — views handle HTTP, services handle business logic
- Makes business rules testable independently of HTTP layer
- Prevents "fat views" anti-pattern

---

## 4. Frontend Architecture (Next.js + React)

### Technology Choices:

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** (App Router) | File-based routing, layouts, metadata |
| **React 19** | UI components, hooks |
| **Tailwind CSS v4** | Utility-first styling, dark mode |
| **Zustand** | Lightweight state management for auth state |
| **React Query** (TanStack Query) | Server state caching, stale-while-revalidate |
| **Axios** | HTTP client with interceptors for JWT |
| **Lucide React** | Icon library |

### App Router File Structure:

```
app/
├── layout.tsx          → Root layout (providers, theme, fonts)
├── page.tsx            → Landing/Login/Register page
├── providers.tsx       → React Query provider
├── globals.css         → Tailwind imports
├── dashboard/          → Dashboard overview
├── projects/           → Project management
├── tasks/              → Task board
├── organizations/      → Org management + permissions
├── settings/           → User profile, theme, account
├── activity/           → Audit log timeline
├── focus/              → Focus mode
├── landing/            → Landing page component
```

### State Management Strategy:

```
┌─────────────────────────────────────────────────┐
│              State Management                    │
├─────────────────────────────────────────────────┤
│  Auth State (Zustand)                           │
│  └── user, token, isAuthenticated               │
│  └── login(), logout(), setUser()               │
│  └── Persisted in localStorage                  │
├─────────────────────────────────────────────────┤
│  Server State (React Query)                     │
│  └── Projects, Tasks, Orgs data                 │
│  └── 5-min stale time, 10-min cache             │
│  └── Auto-refetch on focus                      │
├─────────────────────────────────────────────────┤
│  UI State (React useState)                      │
│  └── Forms, modals, loading states              │
│  └── Component-local, not global                │
├─────────────────────────────────────────────────┤
│  Theme State (React Context)                    │
│  └── Dark/light mode toggle                     │
│  └── Persisted in localStorage                  │
│  └── Flash-free via inline script in <head>     │
└─────────────────────────────────────────────────┘
```

### JWT Token Flow in Frontend:

```
1. Login → POST /accounts/login/ → Receive {access, refresh}
2. Store tokens → localStorage.setItem('access_token', ...)
3. Every API call → Axios interceptor adds Authorization: Bearer <token>
4. On 401 → Interceptor catches, calls POST /accounts/token/refresh/
5. New access token → Update localStorage, retry original request
6. If refresh fails → Clear tokens, redirect to login page
```

---

## 5. Database Design & Models

### Entity Relationship Diagram:

```
User (CustomUser)
 ├── 1:N → Membership → N:1 → Organization
 │                                  ├── 1:N → Project
 │                                  ├── 1:N → Invitation
 │                                  ├── 1:1 → OrgPermissions
 │                                  └── 1:N → AuditLog
 ├── 1:N → ProjectRole → N:1 → Project
 │                                  ├── 1:N → Task
 │                                  ├── 1:N → TaskSection
 │                                  └── 1:N → AuditLog
 ├── 1:N → Notification
 ├── 1:N → FocusedTask → N:1 → Task
 │                                  ├── 1:N → TaskComment
 │                                  ├── 1:N → TaskAttachment
 │                                  ├── N:M → TaskLabel
 │                                  └── N:1 → TaskSection
 └── 1:N → TaskComment
```

### Key Model Design Decisions:

**1. Custom User Model (`accounts.CustomUser`):**
- Extends `AbstractUser` — uses email as `USERNAME_FIELD` instead of username
- Username is still required (for @mentions and invitations) but email is the login field
- Profile fields: avatar, bio, job_title, linkedin_url, etc.
- Soft delete support via `is_deleted` + `deleted_at`
- Custom manager `CustomUserManager` allows login by email OR username

**2. Multi-Tenant Boundary (`orgs.Organization` + `orgs.Membership`):**
- `Membership` is an explicit through model (not Django's auto M2M) — allows storing `role` on the relationship
- Roles: Owner, Admin, Moderator, Member
- `clean()` method enforces: only ONE owner per organization
- `save()` calls `full_clean()` — model-level validation always runs

**3. Task Model (`projects.Task`):**
- 529 lines — the most complex model in the system
- Soft delete: `deleted_at` field, `get_active()` class method filters non-deleted
- Time tracking: `is_timer_running`, `timer_started_at`, `time_spent_minutes`
- Timer methods: `start_timer()`, `pause_timer()`, `stop_timer()`, `reset_timer()` — each creates an `AuditLog` entry
- Labels via M2M, Section via FK (custom workflow stages)
- Preserved deleted user info: `assigned_to_username`, `assigned_to_deleted`

**4. Audit Log (`projects.AuditLog`):**
- Records: who (user), what (action), when (timestamp), where (org/project), details (JSON)
- Action types: create, update, delete, timer_started, timer_paused, timer_stopped, assigned, status_changed, comment_added
- Indexed by org+timestamp, project+timestamp, user+timestamp for fast queries

---

## 6. Authentication & Authorization

### Authentication Flow:

```
Registration:
POST /accounts/register/
  → Validate email, username, password (Django password validators)
  → Create user
  → Auto-generate JWT tokens (access + refresh)
  → Return user data + tokens

Login:
POST /accounts/login/
  → CustomTokenObtainPairSerializer
  → Supports email OR username login (get_by_natural_key)
  → Returns access token (24h) + refresh token (30 days)

Token Refresh:
POST /accounts/token/refresh/
  → Accept refresh token
  → Return new access token
  → Rotate refresh token (ROTATE_REFRESH_TOKENS=True)

Logout:
POST /accounts/logout/
  → Blacklist refresh token
  → Client clears localStorage
```

### JWT Configuration:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,        # New refresh token on each refresh
    'BLACKLIST_AFTER_ROTATION': False,     # Old ones not blacklisted
    'UPDATE_LAST_LOGIN': True,             # Track last login
    'ALGORITHM': 'HS256',
}
```

### Why JWT instead of Session-based auth:
- Frontend and backend are **decoupled** (different domains in production)
- **Stateless** — no server-side session storage, scales horizontally
- **Cross-origin** — works with CORS without cookie complications
- **Mobile-ready** — if mobile clients are added, JWT works out of the box

---

## 7. Multi-Tenancy Architecture

### Tenant Isolation Strategy:

NavFlow uses **application-level multi-tenancy** (shared database, scoped queries):

```
User makes request → JWT decoded → User identified
    → Queryset filters by user's Memberships
        → Only returns data from user's Organizations
            → Only returns projects in those orgs where user has ProjectRole
                → Only returns tasks in those projects
```

### How Isolation is Enforced:

**1. Model Level:**
- `Organization` is the tenant boundary
- `Project.organization` is a FK — projects always belong to one org
- `Membership.unique_together = ('user', 'organization')` — one membership per user-org pair

**2. ViewSet Level (Queryset Scoping):**
```python
class ProjectViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(
            roles__user=user  # Only projects where user has a role
        ).select_related('organization', 'created_by').distinct()
```

**3. Service Level:**
```python
class TaskService:
    @staticmethod
    def can_create_task(user, project):
        role = ProjectRole.objects.filter(user=user, project=project).first()
        if not role:
            raise ValidationError("User is not a member of this project.")
```

**4. Permission Level:**
```python
class IsProjectMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        project = obj if isinstance(obj, Project) else obj.project
        return ProjectRole.objects.filter(user=request.user, project=project).exists()
```

### Why this matters in an interview:
- Shows understanding of **data isolation** in SaaS applications
- Prevents users from seeing other organizations' data
- Prevents cross-tenant data leakage (e.g., adding members from outside the org)

---

## 8. Role-Based Access Control (RBAC)

### Two-Level RBAC:

```
Organization Level:                    Project Level:
├── Owner (1 per org, enforced)        ├── Owner (project creator)
├── Admin                              ├── Admin
├── Moderator                          ├── Moderator
└── Member                             └── Member

Organization Permissions:              Project Permissions:
- Create projects                      - Create tasks (mod+)
- Invite members                       - Update tasks (mod+)
- Manage labels                        - Delete tasks (mod+) — soft delete
- Create tasks                         - Add members (admin+)
- Update member roles                  - Update roles (admin+, no escalation)
                                       - Delete project (owner only)
```

### Permission Enforcement Chain:

```
Request comes in
  1. JWTAuthentication → Is user logged in?
  2. IsAuthenticated → Has valid token?
  3. get_queryset() → Only returns user's data (tenant-scoped)
  4. Custom Permission class → Does user have required role?
  5. OrgPermissions check → Does org allow this role to perform this action?
  6. Service layer validation → Additional business rules
```

### Custom Permission Classes (in `projects/permissions.py`):

| Class | Who Can Access |
|-------|---------------|
| `IsProjectMember` | Any project member |
| `IsProjectOwner` | Project owner only |
| `IsProjectOwnerOrAdmin` | Owner or Admin |
| `IsProjectOwnerAdminOrModerator` | Owner, Admin, or Moderator |
| `IsProjectOwnerOrReadOnly` | Owner writes, members read |
| `CanAssignProjectRoles` | Owner (any role) or Admin (not owner role) |
| `CanManageTasks` | Moderator+ can modify, Members can only read |

### Privilege Escalation Prevention:
```python
class CanAssignProjectRoles(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user_role = ProjectRole.objects.get(user=request.user, project=obj)
        if user_role.role == ProjectRole.ADMIN:
            target_role = request.data.get('role')
            return target_role != ProjectRole.OWNER  # Admin can't make someone owner
```

---

## 9. Key Features Deep Dive

### 9.1 Task Time Tracking
- Each task has: `is_timer_running`, `timer_started_at`, `time_spent_minutes`
- Timer API: `start_timer/`, `pause_timer/`, `stop_timer/`, `reset_timer/`
- On pause/stop: elapsed minutes calculated and added to `time_spent_minutes`
- Every timer action creates an `AuditLog` entry with elapsed time details
- Frontend shows live timer with real-time updates

### 9.2 Soft Deletes
- **Tasks:** `deleted_at` field, `get_active()` filters out deleted
- **Users:** `is_deleted` flag, `deleted_at` timestamp
- On user deletion: username is preserved in `Task.assigned_to_username` and `TaskComment.author_username`
- Allows data recovery and maintains referential integrity in audit logs

### 9.3 Audit Logging
- `AuditLog` model captures: user, action, target (type + id + name), changes (JSON diff), timestamp, IP
- Logged actions: create, update, delete, timer events, assignments, status changes, comments
- Supports both org-level and project-level scoping
- Frontend Activity page with timeline view and filters

### 9.4 @Mentions in Comments
- Comments auto-extract `@username` patterns using regex: `re.findall(r'@(\w+)', content)`
- Mentioned usernames stored in `TaskComment.mentions` (JSONField)
- Creates notifications for mentioned users
- Author info preserved even after account deletion

### 9.5 Organization Invitations
- Invite by username or email
- Invitation statuses: Pending → Accepted / Declined / Expired
- On accept: creates `Membership` record
- Role specified at invitation time
- Notifications sent for new invitations

### 9.6 Focus Mode
- Personal productivity feature — users add tasks to their focus list
- `FocusedTask` model: user + task + personal notes
- `unique_together = ('user', 'task')` prevents duplicates
- Separate from project workflow — personal workspace

### 9.7 Custom Sections (Kanban Columns)
- `TaskSection` model with position-based ordering
- Default sections: To Do, In Progress, In Review, Done
- Mods and admins can create custom sections per project
- Tasks can be assigned to sections + reordered via `position` field
- Drag-and-drop reordering supported via `POST /tasks/reorder/`

### 9.8 Task Labels
- Three scopes: default (global), organization-wide, project-specific
- Each label has: name, color, bg_color, icon, description
- M2M relationship with tasks
- Default labels: Bug, Feature, Enhancement, Documentation, Urgent, Help Wanted

---

## 10. API Design & REST Conventions

### URL Design:

```
/api/v1/accounts/          → Auth, profile, notifications
/api/v1/orgs/              → Organizations, memberships, invitations
/api/v1/projects/          → Projects (ViewSet → auto CRUD)
/api/v1/tasks/             → Tasks (ViewSet → auto CRUD + custom actions)
/api/v1/sections/          → Task sections
/api/v1/labels/            → Task labels
/api/v1/comments/          → Task comments
/api/v1/focus/             → Focus mode
/api/v1/audit-logs/        → Audit trail
/api/docs/                 → Swagger UI (drf-spectacular)
/api/redoc/                → ReDoc documentation
```

### REST Conventions Used:

| Convention | Example |
|-----------|---------|
| Versioned API | `/api/v1/` prefix |
| Resource-based URLs | `/tasks/`, `/projects/` |
| HTTP methods for CRUD | GET=read, POST=create, PUT/PATCH=update, DELETE=remove |
| Nested actions | `/tasks/{id}/start_timer/` via `@action` decorator |
| Pagination | `?page=2&page_size=25` |
| Filtering | `?status=todo&organization_id=1` |
| Search | `?search=keyword` |
| Ordering | `?ordering=-created_at` |
| Consistent error format | `{'detail': 'Error message'}` |

### DRF Router Auto-Generated URLs:

```python
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
# Auto-generates:
# GET    /projects/         → list
# POST   /projects/         → create
# GET    /projects/{id}/    → retrieve
# PUT    /projects/{id}/    → update
# PATCH  /projects/{id}/    → partial_update
# DELETE /projects/{id}/    → destroy
```

---

## 11. Deployment & DevOps

### Production Stack:

| Component | Service | Details |
|-----------|---------|---------|
| **Frontend** | Vercel | Next.js deployed via `vercel.json` config |
| **Backend** | Render | Django + Gunicorn via `render.yaml` |
| **Database** | Render PostgreSQL | Managed PostgreSQL with `DATABASE_URL` |
| **Static Files** | Whitenoise | Serves static files without separate CDN |

### Environment Management:
- `python-decouple` for environment variables (`config()`)
- `dj-database-url` for database URL parsing
- Production security settings auto-enabled when `DEBUG=False`:
  - `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
  - `X_FRAME_OPTIONS = 'DENY'`, `SECURE_BROWSER_XSS_FILTER`

### Key Production Configs:
- **CORS:** Configured via `CORS_ALLOWED_ORIGINS` env variable
- **Static files:** Whitenoise with `CompressedManifestStaticFilesStorage`
- **WSGI server:** Gunicorn for production (vs Django dev server)
- **Database:** PostgreSQL via `psycopg2-binary` adapter

---

## 12. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Repository Pattern** (implicit) | Django ORM + custom Managers | `MembershipManager` encapsulates queries (`get_user_orgs`, `get_admins_and_owners`) |
| **Service Layer** | `services.py` | Separates business logic from HTTP handling |
| **DTO/Serializer** | DRF Serializers | Input validation + output transformation |
| **Strategy Pattern** | Permission Classes | Pluggable permission checks per ViewSet |
| **Observer** (implicit) | AuditLog creation | Side effects (logging) on every CRUD action |
| **Soft Delete** | Task, User models | Data preservation without hard removal |
| **Through Model** | Membership, ProjectRole | Extra data on M2M relationships |
| **Factory Method** | `TaskSection.create_default_sections()` | Creates standard objects with preset values |
| **Interceptor** | Axios interceptors | Cross-cutting concerns (auth headers, token refresh) |
| **Provider Pattern** | React providers | Dependency injection for QueryClient, Theme |
| **Store Pattern** | Zustand `useAuthStore` | Centralized client-side state |

---

## 13. Interview Questions & Answers

### Architecture & Design Questions

**Q: Why did you choose Django + Next.js instead of a monolithic approach?**
> We needed a clear separation between frontend and backend. Django's strength is in data modeling, permissions, and business logic (ORM, DRF), while Next.js provides modern React with file-based routing. Decoupling them means they can be deployed, scaled, and developed independently. The backend is a pure REST API — any client (web, mobile, CLI) can consume it.

**Q: What architectural pattern does this project follow?**
> It follows a **decoupled client-server architecture** with a RESTful API. The backend uses a **layered architecture**: URL routing → ViewSets (controllers) → Serializers (validation/DTOs) → Service Layer (business logic) → Models (ORM). The frontend is a **component-based SPA** with Zustand for auth state and React Query for server state caching.

**Q: Why not use Django templates? Why a separate frontend?**
> Django templates would tightly couple the UI to the backend. With a separate Next.js frontend: (1) we get modern React features (hooks, server components, app router), (2) the API is reusable for mobile/other clients, (3) frontend engineers can work independently, (4) each service can be deployed/scaled independently (Vercel for frontend, Render for backend).

**Q: How does the frontend communicate with the backend?**
> The frontend uses Axios with a configured base URL pointing to the Django API. JWT tokens (access + refresh) are stored in localStorage. An Axios request interceptor attaches the `Authorization: Bearer` header to every request. A response interceptor catches 401 errors and automatically refreshes the token before retrying the request. If the refresh also fails, the user is logged out.

---

### Database & Models Questions

**Q: Why did you use a custom User model instead of Django's default?**
> The default User uses username as the login field. We needed email-based authentication (industry standard for SaaS), plus custom profile fields (avatar, bio, job title, social links), unique usernames for @mentions, soft delete support, and notification preferences. Extending `AbstractUser` lets us keep all of Django's auth machinery (password hashing, permissions) while customizing the model.

**Q: Explain the multi-tenancy approach.**
> It's application-level multi-tenancy with a shared database. The `Organization` model is the tenant boundary. All querysets are scoped via the user's `Membership` records — `ProjectViewSet.get_queryset()` only returns projects where the user has a `ProjectRole`. This filtering happens at every layer: queryset, permission classes, and service layer. No user can ever access another organization's data.

**Q: What's the difference between a regular M2M and a through model?**
> A regular Django M2M auto-creates a junction table with just the two FKs. A through model (`Membership`, `ProjectRole`) lets us add extra fields to the relationship — in our case, `role`, `joined_at`, etc. Without through models, we'd need separate tables for roles, which would be more complex and less queryable.

**Q: How do soft deletes work and why use them?**
> Instead of `DELETE FROM tasks WHERE id=X`, we set `deleted_at = timezone.now()`. The `get_active()` class method filters out records where `deleted_at IS NOT NULL`. Benefits: (1) data can be recovered, (2) audit logs still reference the task, (3) analytics on deleted items, (4) prevents accidental data loss. User deletion also preserves the username in assigned tasks and comments.

---

### Authentication & Security Questions

**Q: Why JWT instead of session-based authentication?**
> Because the frontend and backend are on different domains (Vercel + Render). Session cookies would require `SameSite=None`, complex CORS cookie handling. JWT is stateless, works across origins, is mobile-friendly, and doesn't require server-side session storage. Trade-off: we can't instantly invalidate tokens (mitigated by short access token lifetime of 24h and refresh token rotation).

**Q: How do you handle token expiration?**
> Access tokens expire in 24 hours. Refresh tokens last 30 days. The Axios response interceptor detects 401 errors, automatically calls the refresh endpoint, stores the new access token, and retries the original request. On refresh failure, the user is logged out. `ROTATE_REFRESH_TOKENS=True` means every refresh gives a new refresh token too — the old one can't be reused.

**Q: What security measures are in production?**
> When `DEBUG=False`: SSL redirect, secure cookies, XSS filter, content type nosniff, X-Frame-Options DENY. CORS is restricted to specific origins. Passwords use Django's validators (similarity, minimum length, common passwords, numeric). Database credentials are in environment variables via `python-decouple`. Static files served via Whitenoise with content hashing.

---

### RBAC & Permissions Questions

**Q: Explain the two-level RBAC system.**
> Level 1: Organization roles (Owner/Admin/Moderator/Member) control who can create projects, invite members, manage labels. Level 2: Project roles (same hierarchy) control who can create/edit/delete tasks, manage project members. The `OrgPermissions` model allows per-org customization of which roles can do what. Permission checks cascade: first JWT auth → then org membership → then project role → then the specific permission.

**Q: How do you prevent privilege escalation?**
> The `CanAssignProjectRoles` permission class checks: Owners can assign any role. Admins can assign any role EXCEPT owner. Members and moderators can't assign roles at all. In the `Membership` model, `clean()` enforces only one owner per org. The service layer also validates that users can only add members from their own organization — preventing cross-org membership leakage.

**Q: How is data isolation enforced in a multi-tenant system?**
> Four layers: (1) **Model level** — ForeignKeys and unique constraints scope data to orgs. (2) **Queryset level** — `get_queryset()` filters by user's memberships. (3) **Permission level** — custom DRF permission classes check project/org membership. (4) **Service level** — business logic validates tenant context before operations. Even if someone crafts a request with another org's project ID, the queryset won't return it.

---

### Frontend Questions

**Q: Why Zustand over Redux or Context?**
> Zustand is minimal (~1KB), has no boilerplate (no reducers, actions, dispatch), and works outside React components. For our auth state (user, token, isAuthenticated), Zustand is perfect — simple state with simple getters/setters. Redux would be overkill. Context causes unnecessary re-renders. React Query handles server state separately, so Zustand only manages client-side auth state.

**Q: How do you handle dark mode without flash?**
> An inline `<script>` in the `<head>` reads the theme from `localStorage` before React hydrates, and adds the `dark` class to `<html>`. This prevents the "flash of unstyled content" that happens when dark mode is applied in `useEffect` (after paint). The `ThemeProvider` React Context then manages runtime toggling and persists changes.

**Q: Why React Query alongside Zustand?**
> They solve different problems. Zustand manages **client state** (auth, UI preferences) — data that lives on the client. React Query manages **server state** (projects, tasks, orgs) — data that comes from the API. React Query handles caching (5-min stale time), background refetching, loading states, and error handling. Mixing server state into Zustand would mean reinventing caching logic.

---

### System Design Questions

**Q: How would you scale this application?**
> Backend: (1) Database read replicas for read-heavy queries. (2) Redis caching for frequently accessed data (org permissions, user roles). (3) Celery + Redis for background tasks (sending notification emails, audit log aggregation). (4) Database-level multi-tenancy (separate schemas per org) if single-shared-database becomes a bottleneck. Frontend: Already on Vercel CDN, which handles scaling automatically.

**Q: What would you add next?**
> (1) WebSocket support (Django Channels) for real-time task updates and notifications. (2) File upload to S3/Azure Blob instead of URL references. (3) Celery for async email notifications and scheduled tasks (invitation expiry). (4) Rate limiting to prevent API abuse. (5) Database-level row security policies for defense-in-depth multi-tenancy.

**Q: How do you handle concurrent timer operations?**
> Currently, the timer uses optimistic updates — `start_timer()` checks `is_timer_running` before starting. In a high-concurrency scenario, I'd use `select_for_update()` (database row locking) to prevent race conditions where two requests try to start/stop the timer simultaneously.

---

### Code Quality & Best Practices Questions

**Q: How do you ensure data integrity?**
> Multiple layers: (1) Database constraints — `unique_together`, `UniqueConstraint`, ForeignKeys with appropriate `on_delete`. (2) Model validation — `clean()` methods enforce business rules. (3) Serializer validation — DRF serializers validate input before it reaches models. (4) Service layer validation — business rules checked before operations. (5) Audit logging — every change is recorded for traceability.

**Q: What's the testing strategy?**
> Unit tests for service layer methods (business logic isolation), model tests for validation and constraints, API tests using DRF's test client for endpoint behavior, and permission tests to verify RBAC enforcement. The service layer pattern makes testing easy because business logic is separate from HTTP handling.

**Q: How do you handle N+1 query problems?**
> Using Django's `select_related()` for ForeignKey joins (e.g., `Project.objects.filter(...).select_related('organization', 'created_by')`) and `prefetch_related()` for reverse FK and M2M relations. Pagination (25 items per page) also limits query size. Database indexes on frequently filtered fields (org+status, project+section+position).

---

## 14. Technical Decisions & Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Email-based login | Industry standard for SaaS, users forget usernames | Need to store username separately for @mentions |
| JWT over Sessions | Stateless, cross-origin, mobile-ready | Can't instantly revoke (mitigated by 24h expiry) |
| Shared DB multi-tenancy | Simpler ops, cheaper than DB-per-tenant | Application code must enforce isolation everywhere |
| Soft deletes | Data recovery, audit integrity | More complex queries (must filter `deleted_at IS NULL`) |
| Service layer | Testable business logic, thin views | Extra layer of abstraction |
| Zustand over Redux | Minimal state needed, less boilerplate | Less ecosystem/middleware than Redux |
| PostgreSQL | Reliable, JSON support, full-text search | More ops overhead than SQLite for dev |
| `localStorage` for tokens | Simple, works everywhere | XSS vulnerable (mitigated by CSP and sanitization) |
| Positional ordering for tasks | Users can drag-and-drop reorder | Need to manage position integers on reorder |
| Model-level `clean()` | Prevents invalid data regardless of entry point | Only runs when `full_clean()` is called explicitly |

---

## Quick Reference — What to Mention in Interviews

1. **"I built a multi-tenant SaaS platform"** — immediately shows real-world architecture understanding
2. **"Business logic is in the service layer, not the views"** — shows clean architecture awareness
3. **"RBAC enforcement at 4 layers: queryset, permission, service, model"** — shows security depth
4. **"Audit logging for compliance and traceability"** — shows enterprise thinking
5. **"Soft deletes with data preservation"** — shows data integrity awareness
6. **"JWT with automatic token refresh interceptors"** — shows auth expertise
7. **"Separate state management: Zustand for client state, React Query for server state"** — shows frontend architecture knowledge
8. **"Custom permission classes prevent privilege escalation"** — shows security mindset
9. **"Database indexes on query-heavy fields"** — shows performance awareness
10. **"Decoupled architecture — API is client-agnostic"** — shows scalability thinking
