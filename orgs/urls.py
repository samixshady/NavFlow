from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, InvitationViewSet
from .debug_views import debug_user_info

router = DefaultRouter()
router.register(r'', OrganizationViewSet, basename='organization')

# Separate router for invitations
invitations_router = DefaultRouter()
invitations_router.register(r'', InvitationViewSet, basename='invitation')

urlpatterns = [
    path('debug/', debug_user_info, name='org-debug'),
    path('invitations/', include(invitations_router.urls)),
    path('', include(router.urls)),
]
