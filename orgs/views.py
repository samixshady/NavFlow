from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Organization, Membership
from .serializers import (
    OrganizationSerializer, 
    OrganizationListSerializer,
    AddMemberSerializer,
    MembershipSerializer
)

User = get_user_model()


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
    
    def get_queryset(self):
        """Return organizations that the user is a member of."""
        user = self.request.user
        return Organization.objects.filter(memberships__user=user).distinct()
    
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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create organization
        organization = Organization.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', '')
        )
        
        # Add creator as owner
        Membership.objects.create(
            user=request.user,
            organization=organization,
            role=Membership.OWNER
        )
        
        return Response(
            OrganizationSerializer(organization, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED
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
