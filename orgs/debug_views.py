"""
Debug endpoint to help troubleshoot organization creation issues.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from orgs.models import Organization, Membership
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_info(request):
    """Return debug information about the current user and their organizations."""
    user = request.user
    
    # Get user's organizations
    orgs = Organization.objects.filter(memberships__user=user).distinct()
    
    org_data = []
    for org in orgs:
        try:
            membership = Membership.objects.get(user=user, organization=org)
            org_data.append({
                'id': org.id,
                'name': org.name,
                'description': org.description,
                'role': membership.role,
                'created_at': org.created_at,
            })
        except Membership.DoesNotExist:
            pass
    
    # Get all organizations (for debugging)
    all_orgs_count = Organization.objects.count()
    all_memberships_count = Membership.objects.count()
    
    debug_info = {
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'organizations': org_data,
        'stats': {
            'user_organizations_count': len(org_data),
            'total_organizations_in_db': all_orgs_count,
            'total_memberships_in_db': all_memberships_count,
        },
        'authentication': {
            'is_authenticated': user.is_authenticated,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
        }
    }
    
    logger.info(f'Debug info requested by {user.email}')
    logger.info(f'User has {len(org_data)} organizations')
    
    return Response(debug_info)
