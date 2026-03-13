release: python manage.py migrate
web: gunicorn navflow.wsgi:application --bind 0.0.0.0:$PORT