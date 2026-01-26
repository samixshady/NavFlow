from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from datetime import datetime


@require_http_methods(["GET"])
def api_homepage(request):
    """
    Homepage view for NavFlow API.
    
    Returns a JSON response with:
    - A welcome message confirming the API is running
    - List of available API endpoints
    - Useful metadata (version, timestamp)
    
    This view is safe for both development (DEBUG=True) and production (DEBUG=False).
    No sensitive information is exposed.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse: JSON with API status and endpoints
    """
    response_data = {
        "message": "NavFlow API is running!",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "auth": {
                "register": "/api/v1/auth/register/",
                "login": "/api/v1/auth/login/",
                "logout": "/api/v1/auth/logout/",
                "user_detail": "/api/v1/auth/user/",
                "token_refresh": "/api/v1/auth/token/refresh/",
            },
            "future_endpoints": {
                "projects": "/api/v1/projects/",
                "tasks": "/api/v1/tasks/",
                "teams": "/api/v1/teams/",
            }
        },
        "documentation": {
            "auth_docs": "/docs/AUTH_DOCUMENTATION.md",
            "quick_reference": "/docs/QUICK_REFERENCE.md",
            "api_info": "Use /api/v1/auth/ endpoints for authentication"
        }
    }
    
    return JsonResponse(response_data, status=200, safe=True)
