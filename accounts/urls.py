from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    UserDetailView,
    LogoutView,
    UserProfileView,
    NotificationViewSet,
    AccountDeleteView,
    health_check,
)

app_name = 'accounts'

# Phase 7: Router for notification viewset
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Health check endpoint for deployment monitoring
    path('health/', health_check, name='health_check'),
    
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/', LoginView.as_view(), name='token'),  # Alias for login endpoint
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Token refresh endpoint
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User detail endpoint
    path('user/', UserDetailView.as_view(), name='user_detail'),
    
    # Phase 7: Profile endpoint
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # Phase 8: Account deletion endpoint
    path('delete-account/', AccountDeleteView.as_view(), name='delete_account'),
    
    # Phase 7: Notification routes
    path('', include(router.urls)),
]
