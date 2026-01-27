from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TaskViewSet, AuditLogViewSet, TaskSectionViewSet

# Phase 5: Register all viewsets with router
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'sections', TaskSectionViewSet, basename='section')  # Phase 7

urlpatterns = [
    path('', include(router.urls)),
]
