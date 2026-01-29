from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db import transaction

from .serializers import (
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserDetailSerializer,
    UserProfileUpdateSerializer,
    NotificationSerializer,
    AccountDeleteSerializer
)
from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterView(APIView):
    """
    API endpoint for user registration.
    Accepts POST requests with email, password, first_name, and last_name.
    Returns user data without password.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate tokens for the newly created user
            refresh = RefreshToken.for_user(user)
            
            return Response(
                {
                    'user': serializer.data,
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    },
                    'message': 'User registered successfully.'
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(TokenObtainPairView):
    """
    API endpoint for user login.
    Uses JWT token authentication.
    Accepts POST requests with email and password.
    Returns access and refresh tokens.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class UserDetailView(APIView):
    """
    API endpoint for retrieving current user details.
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    API endpoint for user logout.
    Accepts POST requests with refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {'message': 'Logout successful.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(APIView):
    """
    Phase 7: API endpoint for updating user profile.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserDetailSerializer(request.user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AccountDeleteView(APIView):
    """
    Phase 8: API endpoint for account deletion.
    Soft deletes the account, preserving username for reference in tasks.
    """
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        serializer = AccountDeleteSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        username = user.username
        
        # Import here to avoid circular imports
        from orgs.models import Membership, Organization
        from projects.models import Task, ProjectRole, AuditLog, TaskComment
        
        # Preserve username in assigned tasks
        Task.objects.filter(assigned_to=user).update(
            assigned_to_username=username,
            assigned_to_deleted=True
        )
        
        # Preserve username in comments
        TaskComment.objects.filter(author=user).update(
            author_deleted=True
        )
        
        # Log deletion in all organizations
        for membership in Membership.objects.filter(user=user):
            AuditLog.objects.create(
                organization=membership.organization,
                user=None,
                action='delete',
                content_type='user',
                object_id=user.id,
                object_name=f"{user.get_full_name()} (@{username})",
                changes={'reason': 'Account deleted by user'}
            )
            
            # Notify org admins
            admin_memberships = Membership.objects.filter(
                organization=membership.organization,
                role__in=[Membership.OWNER, Membership.ADMIN]
            ).exclude(user=user)
            
            for admin_membership in admin_memberships:
                Notification.objects.create(
                    user=admin_membership.user,
                    type='account_deleted',
                    title='Member Account Deleted',
                    message=f'{user.get_full_name()} (@{username}) has deleted their account',
                    related_org_id=membership.organization.id,
                    action_status='none'
                )
        
        # Remove from organizations and projects
        Membership.objects.filter(user=user).delete()
        ProjectRole.objects.filter(user=user).delete()
        
        # Delete notifications for this user
        Notification.objects.filter(user=user).delete()
        
        # Completely delete the user (hard delete)
        user.delete()
        
        return Response({
            'message': 'Account deleted successfully',
            'username': username
        }, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Phase 7: ViewSet for managing notifications.
    Phase 8: Added accept/decline for actionable notifications.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications."""
        notifications = self.get_queryset().filter(is_read=False)[:20]
        serializer = self.get_serializer(notifications, many=True)
        return Response({
            'count': self.get_queryset().filter(is_read=False).count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all notifications with pagination."""
        notifications = self.get_queryset()[:50]
        serializer = self.get_serializer(notifications, many=True)
        return Response({
            'count': self.get_queryset().count(),
            'unread_count': self.get_queryset().filter(is_read=False).count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(self.get_serializer(notification).data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept(self, request, pk=None):
        """Accept an actionable notification (invitation)."""
        notification = self.get_object()
        
        if not notification.is_actionable:
            return Response(
                {'detail': 'This notification cannot be accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from orgs.models import Membership, Organization, Invitation
        from projects.models import ProjectRole, Project
        
        if notification.type == 'org_invite':
            # Handle organization invitation
            invitation_id = notification.action_data.get('invitation_id')
            if invitation_id:
                try:
                    invitation = Invitation.objects.get(
                        id=invitation_id,
                        invited_user=request.user,
                        status='pending'
                    )
                    # Create membership
                    Membership.objects.create(
                        user=request.user,
                        organization=invitation.organization,
                        role=invitation.role
                    )
                    invitation.status = 'accepted'
                    invitation.responded_at = timezone.now()
                    invitation.save()
                    
                    # Notify the inviter
                    Notification.objects.create(
                        user_id=invitation.invited_by_id,
                        type='invitation_accepted',
                        title='Invitation Accepted',
                        message=f'{request.user.get_display_name()} accepted your invitation to join "{invitation.organization.name}".',
                        link='/organizations',
                        related_org_id=invitation.organization.id,
                        actor_id=request.user.id,
                        actor_name=request.user.get_full_name(),
                        actor_username=request.user.username
                    )
                except Invitation.DoesNotExist:
                    return Response(
                        {'detail': 'Invitation not found or already processed'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                except Exception as e:
                    return Response(
                        {'detail': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    invitation.status = 'accepted'
                    invitation.save()
                except Invitation.DoesNotExist:
                    pass
        
        elif notification.type == 'project_invite':
            # Handle project invitation
            project_id = notification.action_data.get('project_id')
            role = notification.action_data.get('role', 'member')
            if project_id:
                try:
                    project = Project.objects.get(id=project_id)
                    ProjectRole.objects.get_or_create(
                        user=request.user,
                        project=project,
                        defaults={'role': role}
                    )
                except Project.DoesNotExist:
                    pass
        
        notification.action_status = 'accepted'
        notification.is_read = True
        notification.save()
        
        return Response(self.get_serializer(notification).data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decline(self, request, pk=None):
        """Decline an actionable notification (invitation)."""
        notification = self.get_object()
        
        if not notification.is_actionable:
            return Response(
                {'detail': 'This notification cannot be declined'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from orgs.models import Invitation
        
        if notification.type == 'org_invite':
            invitation_id = notification.action_data.get('invitation_id')
            if invitation_id:
                try:
                    invitation = Invitation.objects.get(
                        id=invitation_id,
                        invited_user=request.user,
                        status='pending'
                    )
                    invitation.status = 'declined'
                    invitation.responded_at = timezone.now()
                    invitation.save()
                    
                    # Notify the inviter
                    Notification.objects.create(
                        user_id=invitation.invited_by_id,
                        type='invitation_declined',
                        title='Invitation Declined',
                        message=f'{request.user.get_display_name()} declined your invitation to join "{invitation.organization.name}".',
                        link='/organizations',
                        related_org_id=invitation.organization.id,
                        actor_id=request.user.id,
                        actor_name=request.user.get_full_name(),
                        actor_username=request.user.username
                    )
                except Invitation.DoesNotExist:
                    pass
        
        notification.action_status = 'declined'
        notification.is_read = True
        notification.save()
        
        return Response(self.get_serializer(notification).data)


# Health check endpoint for deployment monitoring
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring service availability.
    Returns 200 OK if the service is running.
    """
    return Response({
        'status': 'healthy',
        'service': 'navflow-api',
        'timestamp': timezone.now().isoformat()
    })
