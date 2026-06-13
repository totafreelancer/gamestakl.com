from django.core.management.base import BaseCommand
from django.core.management import call_command
from pathlib import Path
from django.conf import settings

class Command(BaseCommand):
    help = 'Load initial data from data_dump.json if database is empty'

    def handle(self, *args, **options):
        dump_file = Path(settings.BASE_DIR) / 'data_dump.json'
        
        if not dump_file.exists():
            self.stdout.write(self.style.WARNING('data_dump.json not found, skipping data load.'))
            return

        # Check if data already exists
        from authentication.models import User
        if User.objects.exists():
            self.stdout.write(self.style.SUCCESS('Data already exists, skipping load.'))
            return

        self.stdout.write('Loading initial data from data_dump.json...')
        try:
            call_command('loaddata', str(dump_file), verbosity=1)
            self.stdout.write(self.style.SUCCESS('Data loaded successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error loading data: {e}'))
