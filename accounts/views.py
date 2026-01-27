from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserDetailSerializer,
    UserProfileUpdateSerializer,
    NotificationSerializer
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


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Phase 7: ViewSet for managing notifications.
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
