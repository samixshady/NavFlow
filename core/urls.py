from django.urls import path
from .views import api_homepage

app_name = 'core'

urlpatterns = [
    path('', api_homepage, name='homepage'),
]
