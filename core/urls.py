from django.urls import path
from .views import api_homepage, health_check

app_name = 'core'

urlpatterns = [
    path('', api_homepage, name='homepage'),
    path('health/', health_check, name='health'),
]
