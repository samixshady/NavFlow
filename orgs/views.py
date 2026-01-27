from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
import logging
from .models import Organization, Membership, Invitation
from .serializers import (
    OrganizationSerializer, 
    OrganizationListSerializer,
    AddMemberSerializer,
    MembershipSerializer,
    InvitationSerializer,
    CreateInvitationSerializer,
    UpdateMemberRoleSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


class IsOrganizationMember(permissions.BasePermission):
    """
    Custom permission to check if user is a member of the organization.
    """
    def has_object_permission(self, request, view, obj):
        return Membership.objects.filter(user=request.user, organization=obj).exists()


class IsOrganizationAdmin(permissions.BasePermission):
    """
    Custom permission to check if user is an admin or owner of the organization.
    """
    def has_object_permission(self, request, view, obj):
        try:
            membership = Membership.objects.get(user=request.user, organization=obj)
            return membership.role in [Membership.ADMIN, Membership.OWNER]
        except Membership.DoesNotExist:
            return False


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Disable pagination for organizations
    
    def get_queryset(self):
        """Return organizations that the user is a member of."""
        user = self.request.user
        logger.info(f'Getting organizations for user: {user.email}')
        orgs = Organization.objects.filter(memberships__user=user).distinct()
        logger.info(f'Found {orgs.count()} organizations for user {user.email}')
        for org in orgs:
            membership = Membership.objects.get(user=user, organization=org)
            logger.info(f'  - {org.name} (Role: {membership.role})')
        return orgs
    
    def get_serializer_class(self):
        """Use simplified serializer for list action."""
        if self.action == 'list':
            return OrganizationListSerializer
        return OrganizationSerializer
    
    def get_serializer_context(self):
        """Add user to serializer context."""
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Create a new organization and add the creator as owner.
        """
        logger.info(f'Creating organization for user: {request.user.email}')
        logger.info(f'Request data: {request.data}')
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                # Create organization
                organization = Organization.objects.create(
                    name=serializer.validated_data['name'],
                    description=serializer.validated_data.get('description', '')
                )
                logger.info(f'Organization created: ID={organization.id}, Name={organization.name}')
                
                # Add creator as owner
                membership = Membership.objects.create(
                    user=request.user,
                    organization=organization,
                    role=Membership.OWNER
                )
                logger.info(f'Membership created: User={request.user.email}, Org={organization.name}, Role={membership.role}')
                
                # Verify it was saved
                org_count = Organization.objects.filter(id=organization.id).count()
                membership_count = Membership.objects.filter(organization=organization, user=request.user).count()
                logger.info(f'Verification: Org exists={org_count}, Membership exists={membership_count}')
                
                response_data = OrganizationSerializer(organization, context=self.get_serializer_context()).data
                logger.info(f'Returning response: {response_data}')
                
                return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Error creating organization: {str(e)}', exc_info=True)
            return Response(
                {'error': f'Failed to create organization: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Update organization - only admins and owners can update."""
        organization = self.get_object()
        
        # Check permission
        self.check_object_permissions(request, organization)
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role not in [Membership.ADMIN, Membership.OWNER]:
                return Response(
                    {'detail': 'You do not have permission to update this organization.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete organization - only owner can delete.
        This will cascade delete all projects, tasks, and memberships.
        """
        organization = self.get_object()
        
        # Check if user is owner
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role != Membership.OWNER:
                return Response(
                    {'detail': 'Only the organization owner can delete the organization.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        org_name = organization.name
        # Delete the organization (cascades to projects, tasks, memberships, invitations)
        organization.delete()
        
        return Response(
            {'detail': f'Organization "{org_name}" and all its data have been deleted.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """
        Get detailed organization info including all projects and members.
        """
        organization = self.get_object()
        
        # Check if user is a member
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all projects in this organization
        from projects.models import Project, Task
        from projects.serializers import ProjectListSerializer
        
        projects = Project.objects.filter(organization=organization).select_related('created_by')
        
        # Calculate stats
        total_projects = projects.count()
        active_projects = projects.filter(status='active').count()
        total_tasks = Task.objects.filter(project__organization=organization).count()
        completed_tasks = Task.objects.filter(project__organization=organization, status='done').count()
        
        # Get all members with their roles
        memberships = organization.memberships.all().select_related('user')
        members_data = []
        for m in memberships:
            members_data.append({
                'id': m.id,
                'user_id': m.user.id,
                'user_email': m.user.email,
                'user_name': f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
                'role': m.role,
                'role_display': m.get_role_display(),
                'joined_at': m.joined_at,
            })
        
        # Serialize projects
        projects_data = ProjectListSerializer(projects, many=True, context={'user': request.user}).data
        
        # Build response
        response_data = {
            'id': organization.id,
            'name': organization.name,
            'description': organization.description,
            'created_at': organization.created_at,
            'updated_at': organization.updated_at,
            'user_role': membership.role,
            'stats': {
                'total_projects': total_projects,
                'active_projects': active_projects,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'total_members': len(members_data),
            },
            'members': members_data,
            'projects': projects_data,
        }
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
        Add a member to the organization.
        Only admins and owners can add members.
        """
        organization = self.get_object()
        
        # Check if user is admin or owner
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role not in [Membership.ADMIN, Membership.OWNER]:
                return Response(
                    {'detail': 'Only admins and owners can add members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate and create membership
        serializer = AddMemberSerializer(
            data=request.data,
            context={'organization': organization}
        )
        serializer.is_valid(raise_exception=True)
        
        user = User.objects.get(email=serializer.validated_data['email'])
        new_membership = Membership.objects.create(
            user=user,
            organization=organization,
            role=serializer.validated_data['role']
        )
        
        return Response(
            MembershipSerializer(new_membership).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of an organization."""
        organization = self.get_object()
        
        # Check if user is a member
        if not Membership.objects.filter(user=request.user, organization=organization).exists():
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        memberships = organization.memberships.all()
        serializer = MembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """
        Remove a member from the organization.
        Only admins and owners can remove members (except themselves).
        """
        organization = self.get_object()
        
        # Check if user is admin or owner
        try:
            user_membership = Membership.objects.get(user=request.user, organization=organization)
            if user_membership.role not in [Membership.ADMIN, Membership.OWNER]:
                return Response(
                    {'detail': 'Only admins and owners can remove members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get member to remove
        member_email = request.data.get('email')
        if not member_email:
            return Response(
                {'detail': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            member_user = User.objects.get(email=member_email)
            member_membership = Membership.objects.get(
                user=member_user,
                organization=organization
            )
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'User is not a member of this organization.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent removing the owner (unless changing role first)
        if member_membership.role == Membership.OWNER:
            return Response(
                {'detail': 'Cannot remove the organization owner.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        member_membership.delete()
        return Response({'detail': 'Member removed successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """
        Invite a user to the organization by username.
        Only owners and admins can invite.
        """
        organization = self.get_object()
        
        # Check if user is admin or owner
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role not in [Membership.ADMIN, Membership.OWNER]:
                return Response(
                    {'detail': 'Only owners and admins can invite members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateInvitationSerializer(
            data=request.data,
            context={'organization': organization, 'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        
        identifier = serializer.validated_data['identifier']
        # Find user by email or username
        invited_user = User.objects.filter(email=identifier).first()
        if not invited_user:
            invited_user = User.objects.filter(username=identifier).first()
        
        invitation = Invitation.objects.create(
            organization=organization,
            invited_user=invited_user,
            invited_by=request.user,
            role=serializer.validated_data['role']
        )
        
        return Response(
            InvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'])
    def invitations(self, request, pk=None):
        """Get all pending invitations for an organization."""
        organization = self.get_object()
        
        # Check if user is admin or owner
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role not in [Membership.ADMIN, Membership.OWNER]:
                return Response(
                    {'detail': 'Only owners and admins can view invitations.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitations = organization.invitations.filter(status=Invitation.PENDING)
        serializer = InvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        """
        Update a member's role in the organization.
        Only owners can change roles.
        """
        organization = self.get_object()
        
        # Check if user is owner
        try:
            membership = Membership.objects.get(user=request.user, organization=organization)
            if membership.role != Membership.OWNER:
                return Response(
                    {'detail': 'Only owners can change member roles.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Membership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this organization.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UpdateMemberRoleSerializer(
            data=request.data,
            context={'organization': organization, 'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        
        user = User.objects.get(email=serializer.validated_data['user_email'])
        member_membership = Membership.objects.get(user=user, organization=organization)
        member_membership.role = serializer.validated_data['role']
        member_membership.save()
        
        return Response(
            MembershipSerializer(member_membership).data,
            status=status.HTTP_200_OK
        )


class InvitationViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user's received invitations.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get all pending invitations for the current user."""
        invitations = Invitation.objects.filter(
            invited_user=request.user,
            status=Invitation.PENDING
        )
        serializer = InvitationSerializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept an invitation."""
        try:
            invitation = Invitation.objects.get(
                id=pk,
                invited_user=request.user,
                status=Invitation.PENDING
            )
        except Invitation.DoesNotExist:
            return Response(
                {'detail': 'Invitation not found or already processed.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            invitation.accept()
            return Response({
                'detail': f'You are now a member of {invitation.organization.name}.',
                'organization_id': invitation.organization.id
            })
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline an invitation."""
        try:
            invitation = Invitation.objects.get(
                id=pk,
                invited_user=request.user,
                status=Invitation.PENDING
            )
        except Invitation.DoesNotExist:
            return Response(
                {'detail': 'Invitation not found or already processed.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invitation.decline()
        return Response({'detail': 'Invitation declined.'})
