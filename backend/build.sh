#!/usr/bin/env bash
set -o errexit

echo "==> Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Running migrations..."
python manage.py migrate --no-input

echo "==> Collecting static files..."
python manage.py collectstatic --no-input

echo "==> Build complete!"
