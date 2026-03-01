"""
Performance optimization utilities.
Includes query optimization, caching strategies, and advanced pagination.
"""
from typing import Any, List, Dict, Optional
from django.db.models import QuerySet, Prefetch, prefetch_related_objects
from rest_framework.pagination import CursorPagination, PageNumberPagination
from rest_framework.response import Response
from django.core.cache import cache
from functools import wraps
import hashlib
import json


class CursorPaginationOptimized(CursorPagination):
    """
    Optimized cursor-based pagination for large datasets.
    Better than offset pagination for scalability.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'


class OptimizedPagePagination(PageNumberPagination):
    """Standard pagination with optimization."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class QueryOptimizer:
    """
    Utility class for optimizing Django ORM queries.
    Provides helpers for select_related, prefetch_related, and query analysis.
    """
    
    @staticmethod
    def optimize_task_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize task queryset with common relationships."""
        return queryset.select_related(
            'project',
            'project__organization',
            'created_by',
            'assigned_to',
            'section'
        ).prefetch_related(
            'labels',
            'subtasks',
            'attachments',
            Prefetch('comments', queryset=Task.objects.filter(is_deleted=False))
        )
    
    @staticmethod
    def optimize_project_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize project queryset with common relationships."""
        return queryset.select_related(
            'organization',
            'created_by'
        ).prefetch_related(
            'sections',
            'labels',
            'members'
        )
    
    @staticmethod
    def optimize_user_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize user queryset."""
        return queryset.prefetch_related(
            'memberships__organization',
            'assigned_tasks',
            'created_projects'
        )
    
    @staticmethod
    def analyze_query_count(func):
        """
        Decorator to count and log database queries.
        Usage: @QueryOptimizer.analyze_query_count
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            from django.db import connection, reset_queries
            from django.conf import settings
            
            if settings.DEBUG:
                reset_queries()
            
            result = func(*args, **kwargs)
            
            if settings.DEBUG:
                print(f"\n{func.__name__} executed {len(connection.queries)} queries")
                for query in connection.queries:
                    print(f"  - {query['time']}s: {query['sql'][:100]}...")
            
            return result
        
        return wrapper


def cache_result(timeout: int = 3600, key_prefix: str = ""):
    """
    Decorator to cache function results.
    
    Usage:
        @cache_result(timeout=300, key_prefix="user_data")
        def get_user_data(user_id):
            return expensive_operation()
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{args}:{kwargs}"
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Check cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Compute result
            result = func(*args, **kwargs)
            
            # Cache result
            cache.set(cache_key, result, timeout)
            return result
        
        return wrapper
    
    return decorator


class DatabaseOptimizationMiddleware:
    """
    Middleware to monitor and optimize database queries on each request.
    Logs warnings for N+1 query problems.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from django.db import connection, reset_queries
        from django.conf import settings
        
        if settings.DEBUG:
            reset_queries()
        
        response = self.get_response(request)
        
        if settings.DEBUG and len(connection.queries) > 50:
            print(f"\n⚠️  WARNING: {len(connection.queries)} database queries on {request.path}")
            print("Consider using select_related or prefetch_related")
        
        return response


class BulkOperationHelper:
    """Helper for efficient bulk operations."""
    
    @staticmethod
    def bulk_create_optimized(model, instances: List[Any], batch_size: int = 1000):
        """
        Bulk create records in batches for efficiency.
        Handles large datasets without memory issues.
        """
        created_instances = []
        for i in range(0, len(instances), batch_size):
            batch = instances[i:i + batch_size]
            created = model.objects.bulk_create(batch, batch_size=batch_size)
            created_instances.extend(created)
        
        return created_instances
    
    @staticmethod
    def bulk_update_optimized(
        model,
        instances: List[Any],
        fields: List[str],
        batch_size: int = 1000
    ):
        """
        Bulk update records efficiently.
        """
        for i in range(0, len(instances), batch_size):
            batch = instances[i:i + batch_size]
            model.objects.bulk_update(batch, fields, batch_size=batch_size)


class PaginatedResponseHelper:
    """Helper to format paginated responses consistently."""
    
    @staticmethod
    def paginate_and_response(
        queryset: QuerySet,
        paginator,
        serializer_class,
        request,
        **serializer_kwargs
    ) -> Response:
        """
        Paginate queryset and return formatted response.
        """
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = serializer_class(page, many=True, **serializer_kwargs)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = serializer_class(queryset, many=True, **serializer_kwargs)
        return Response(serializer.data)
