#!/bin/bash
# Build script for Render deployment

echo "Starting build process..."

# Install Python dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run database migrations
echo "Running migrations..."
python manage.py migrate --no-input

echo "Build completed successfully!"
