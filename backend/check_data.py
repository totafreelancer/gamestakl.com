import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, r'C:\Users\HP\Desktop\HubZone\HubZone\backend')
import django
django.setup()
from tournaments.models import Tournament
from forum.models import ForumPost
from authentication.models import User

print(f"Users: {User.objects.count()}")
print(f"Tournaments: {Tournament.objects.count()}")
print(f"Forum Posts: {ForumPost.objects.count()}")

print("\n--- Tournaments ---")
for t in Tournament.objects.all()[:5]:
    print(f"  {t.id}: {t.title} | {t.status} | {t.game_name}")

print("\n--- Forum Posts ---")
for p in ForumPost.objects.all()[:5]:
    print(f"  {p.id}: {p.content[:50]}...")
