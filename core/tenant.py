"""
Multi-tenant context and middleware for SaaS architecture.
Handles tenant isolation and organization-scoped data access.
"""
import threading
from typing import Optional
from django.http import JsonResponse
from orgs.models import Organization

# Thread-local storage for current tenant context
_tenant_context = threading.local()


class TenantContext:
    """Thread-safe tenant context manager."""
    
    @staticmethod
    def set_tenant(organization: Optional[Organization]):
        """Set current tenant in thread-local storage."""
        _tenant_context.organization = organization
    
    @staticmethod
    def get_tenant() -> Optional[Organization]:
        """Get current tenant from thread-local storage."""
        return getattr(_tenant_context, 'organization', None)
    
    @staticmethod
    def clear_tenant():
        """Clear tenant context."""
        _tenant_context.organization = None


class MultiTenantMiddleware:
    """
    Middleware to extract and validate tenant from request.
    Extracts organization from:
    1. Query parameter: ?org_id=123
    2. Header: X-Organization-ID: 123
    3. User's default organization (optional)
    
    Sets tenant context for the entire request lifecycle.
    Gracefully handles requests without organization context.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            # Extract organization
            org_id = self._get_org_id(request)
            
            if org_id:
                try:
                    # Verify user has access to this organization
                    organization = Organization.objects.get(id=org_id)
                    
                    # Check if user is member of organization
                    if request.user.is_authenticated:
                        if not request.user.memberships.filter(organization=organization).exists():
                            TenantContext.clear_tenant()
                            return JsonResponse(
                                {'error': 'Unauthorized: No access to this organization'},
                                status=403
                            )
                    
                    TenantContext.set_tenant(organization)
                    request.organization = organization
                except Organization.DoesNotExist:
                    TenantContext.clear_tenant()
                    return JsonResponse({'error': 'Organization not found'}, status=404)
            elif request.user.is_authenticated:
                # Try to use user's first organization as default (optional)
                try:
                    first_org = request.user.memberships.select_related('organization').first()
                    if first_org:
                        TenantContext.set_tenant(first_org.organization)
                        request.organization = first_org.organization
                except Exception:
                    # If there's any issue, just proceed without tenant context
                    pass
            
            response = self.get_response(request)
            TenantContext.clear_tenant()
            return response
        except Exception as e:
            # Log the error and proceed
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"MultiTenantMiddleware error: {str(e)}")
            TenantContext.clear_tenant()
            
            response = self.get_response(request)
            TenantContext.clear_tenant()
            return response
    
    def _get_org_id(self, request) -> Optional[int]:
        """Extract organization ID from request."""
        # Check query parameter
        org_id = request.GET.get('org_id')
        if org_id:
            return int(org_id) if org_id.isdigit() else None
        
        # Check header
        org_id = request.META.get('HTTP_X_ORGANIZATION_ID')
        if org_id:
            return int(org_id) if org_id.isdigit() else None
        
        return None


class TenantAwareQuerySet:
    """
    Mixin for querysets to automatically filter by current tenant.
    Usage: class MyQuerySet(TenantAwareQuerySet, models.QuerySet):
           def get_queryset(self):
               return MyQuerySet(self.model).filter_by_tenant()
    """
    
    def filter_by_tenant(self):
        """Filter queryset by current tenant organization."""
        organization = TenantContext.get_tenant()
        if organization:
            return self.filter(organization=organization)
        return self
