from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, 
    TaskViewSet, 
    AuditLogViewSet, 
    TaskSectionViewSet,
    TaskLabelViewSet,
    TaskCommentViewSet,
    TaskAttachmentViewSet,
    FocusedTaskViewSet
)

# Phase 5: Register all viewsets with router
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'sections', TaskSectionViewSet, basename='section')  # Phase 7
router.register(r'labels', TaskLabelViewSet, basename='label')  # Phase 8
router.register(r'comments', TaskCommentViewSet, basename='comment')  # Phase 8
router.register(r'attachments', TaskAttachmentViewSet, basename='attachment')  # Phase 8
router.register(r'focus', FocusedTaskViewSet, basename='focus')  # Phase 8

urlpatterns = [
    path('', include(router.urls)),
]
