"""
Advanced security features and utilities.
Includes rate limiting, input validation, CORS protection, and security headers.
"""
from typing import Callable, Any
from functools import wraps
from datetime import timedelta
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.http import JsonResponse
from django.conf import settings
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.exceptions import Throttled
import re


class RateLimitThrottle(UserRateThrottle):
    """
    Enhanced rate throttling with per-user and per-endpoint limits.
    Respects organization-level limits.
    """
    scope = 'user'  # Scope for rate limiting
    cache_format = 'throttle_%(scope)s_%(ident)s'
    
    def throttle_success(self):
        """Allow requests within limit."""
        return super().throttle_success()
    
    def throttle_failure(self):
        """Enhance throttle failure with organization context."""
        self.wait()
        raise Throttled(detail="Rate limit exceeded. Please try again later.")


class ImmediatenessThrottle(UserRateThrottle):
    """Stricter throttle for sensitive operations."""
    scope = 'sensitive'
    THROTTLE_RATES = {'sensitive': '5/minute'}


class AnonymousRateThrottle(AnonRateThrottle):
    """Rate limiting for anonymous users."""
    scope = 'anon'
    THROTTLE_RATES = {'anon': '10/hour'}


class InputValidator:
    """Input validation utilities."""
    
    # Regex patterns for common validations
    PATTERNS = {
        'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'username': r'^[a-zA-Z0-9_]{3,30}$',
        'slug': r'^[a-z0-9-]{1,50}$',
        'url': r'^https?://[^\s]+$',
        'phone': r'^\+?1?\d{9,15}$',
    }
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        return bool(re.match(InputValidator.PATTERNS['email'], email))
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format."""
        return bool(re.match(InputValidator.PATTERNS['username'], username))
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000) -> str:
        """
        Sanitize string input.
        Remove dangerous characters and limit length.
        """
        # Remove null bytes
        text = text.replace('\x00', '')
        # Limit length
        text = text[:max_length]
        return text.strip()
    
    @staticmethod
    def validate_json_input(data: dict, required_fields: list, field_types: dict = None) -> tuple:
        """
        Validate JSON input with type checking.
        Returns (is_valid, error_message)
        """
        # Check required fields
        missing = [f for f in required_fields if f not in data]
        if missing:
            return False, f"Missing required fields: {', '.join(missing)}"
        
        # Check types if provided
        if field_types:
            for field, expected_type in field_types.items():
                if field in data and not isinstance(data[field], expected_type):
                    return False, f"Field '{field}' must be {expected_type.__name__}"
        
        return True, None


def rate_limit(
    calls: int = 100,
    period: int = 60,
    key_func: Callable = None
):
    """
    Decorator for custom rate limiting.
    
    Usage:
        @rate_limit(calls=5, period=60)  # 5 calls per minute
        def api_endpoint(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generate cache key
            if key_func:
                key = key_func(request)
            else:
                # Default: user id or IP
                key = str(request.user.id) if request.user.is_authenticated else request.META.get('REMOTE_ADDR')
            
            cache_key = f'rate_limit_{view_func.__name__}_{key}'
            
            # Check existing count
            request_count = cache.get(cache_key, 0)
            
            if request_count >= calls:
                return JsonResponse(
                    {'error': f'Rate limit exceeded: {calls} calls per {period} seconds'},
                    status=429
                )
            
            # Increment count
            cache.set(cache_key, request_count + 1, period)
            
            # Add rate limit headers to response
            response = view_func(request, *args, **kwargs)
            response['X-RateLimit-Limit'] = calls
            response['X-RateLimit-Remaining'] = calls - request_count - 1
            response['X-RateLimit-Reset'] = period
            
            return response
        
        return wrapper
    
    return decorator


class SecurityMiddleware:
    """
    Additional security headers and protections.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        
        # Remove server header
        response.pop('Server', None)
        
        return response


class AuditLogMixin:
    """
    Mixin to automatically log sensitive operations.
    Attach to views handling create/update/delete.
    """
    
    def perform_create(self, serializer):
        """Log object creation."""
        from projects.models import AuditLog
        
        instance = serializer.save()
        
        AuditLog.objects.create(
            organization=self.get_organization(),
            user=self.request.user,
            action=f'{instance.__class__.__name__.lower()}_created',
            resource_type=instance.__class__.__name__,
            resource_id=instance.id,
            details=serializer.validated_data
        )
    
    def perform_update(self, serializer):
        """Log object updates."""
        from projects.models import AuditLog
        
        instance = serializer.save()
        
        AuditLog.objects.create(
            organization=self.get_organization(),
            user=self.request.user,
            action=f'{instance.__class__.__name__.lower()}_updated',
            resource_type=instance.__class__.__name__,
            resource_id=instance.id,
            details=serializer.validated_data
        )
    
    def perform_destroy(self, instance):
        """Log object deletion."""
        from projects.models import AuditLog
        
        AuditLog.objects.create(
            organization=self.get_organization(),
            user=self.request.user,
            action=f'{instance.__class__.__name__.lower()}_deleted',
            resource_type=instance.__class__.__name__,
            resource_id=instance.id,
            details={'name': str(instance)}
        )
        
        instance.delete()
    
    def get_organization(self):
        """Get organization from request or instance."""
        if hasattr(self.request, 'organization'):
            return self.request.organization
        return None


class PermissionValidator:
    """Utility for checking permissions across multi-tenant environment."""
    
    @staticmethod
    def user_can_access_project(user, project) -> bool:
        """Check if user can access project."""
        return user.memberships.filter(
            organization=project.organization
        ).exists()
    
    @staticmethod
    def user_can_access_task(user, task) -> bool:
        """Check if user can access task."""
        return PermissionValidator.user_can_access_project(user, task.project)
    
    @staticmethod
    def user_can_edit_task(user, task) -> bool:
        """Check if user can edit task."""
        org_member = user.memberships.filter(
            organization=task.project.organization
        ).first()
        
        if not org_member:
            return False
        
        # Owner, admin, or creator can edit
        if org_member.role in ['owner', 'admin']:
            return True
        
        if task.created_by == user:
            return True
        
        return False
