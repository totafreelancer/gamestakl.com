import os
import random
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.core.files import File
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone
from PIL import Image

from authentication.models import User, GamerProfile
from forum.models import ForumPost, Comment
from tournaments.models import Tournament, TournamentParticipant


def create_placeholder_image(width, height, color, text, format='PNG'):
    """Generate a simple placeholder image with text."""
    img = Image.new('RGB', (width, height), color=color)
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return ContentFile(buffer.getvalue(), f'{text.lower().replace(" ", "_")}.{format.lower()}')


def get_color(index):
    colors = [
        (66, 133, 244),   # Blue
        (219, 68, 55),    # Red
        (244, 160, 0),    # Orange
        (15, 157, 88),    # Green
        (171, 71, 188),   # Purple
        (0, 172, 193),    # Cyan
        (255, 112, 67),   # Deep Orange
        (63, 81, 181),    # Indigo
        (121, 85, 72),    # Brown
        (74, 144, 226),   # Light Blue
    ]
    return colors[index % len(colors)]


class Command(BaseCommand):
    help = 'Seed the database with admin, users, posts, and tournaments with images'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting database seeding...'))

        # ── 1. Create Admin User ──────────────────────────────────────────
        admin_email = 'totamotiur@gmail.com'
        admin_password = 'Motiur203@'
        admin_username = 'totamotiur'

        admin_user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                'username': admin_username,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        admin_user.set_password(admin_password)
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Admin user "{admin_username}" created.'))
        else:
            self.stdout.write(self.style.WARNING(f'Admin user "{admin_username}" already exists. Password updated.'))

        # Create admin gamer profile
        admin_profile, _ = GamerProfile.objects.get_or_create(
            user=admin_user,
            defaults={
                'in_game_id': 'ADMIN_001',
                'points': Decimal('9999.00'),
                'vip_status': True,
            }
        )
        if not admin_profile.profile_picture:
            img = create_placeholder_image(200, 200, (66, 133, 244), 'Admin', 'PNG')
            admin_profile.profile_picture.save(f'admin_{admin_user.id}.png', img, save=True)
            self.stdout.write(self.style.SUCCESS('Admin profile picture added.'))

        # ── 2. Create Additional Users ─────────────────────────────────────
        users_data = [
            {'username': 'shadow_hunter', 'email': 'shadow@hunter.com', 'password': 'Shadow123@', 'in_game_id': 'SHADOW_01', 'points': Decimal('500.00')},
            {'username': 'pixel_warrior', 'email': 'pixel@warrior.com', 'password': 'Pixel123@', 'in_game_id': 'PIXEL_02', 'points': Decimal('750.00')},
            {'username': 'night_owl', 'email': 'night@owl.com', 'password': 'Night123@', 'in_game_id': 'OWL_003', 'points': Decimal('320.00')},
            {'username': 'dragon_slayer', 'email': 'dragon@slayer.com', 'password': 'Dragon123@', 'in_game_id': 'DRAGON_04', 'points': Decimal('1200.00')},
            {'username': 'cyber_ninja', 'email': 'cyber@ninja.com', 'password': 'Cyber123@', 'in_game_id': 'NINJA_005', 'points': Decimal('890.00')},
            {'username': 'storm_rider', 'email': 'storm@rider.com', 'password': 'Storm123@', 'in_game_id': 'STORM_06', 'points': Decimal('450.00')},
            {'username': 'blaze_master', 'email': 'blaze@master.com', 'password': 'Blaze123@', 'in_game_id': 'BLAZE_007', 'points': Decimal('670.00')},
            {'username': 'frost_queen', 'email': 'frost@queen.com', 'password': 'Frost123@', 'in_game_id': 'FROST_008', 'points': Decimal('540.00')},
        ]

        created_users = []
        for i, ud in enumerate(users_data):
            user, u_created = User.objects.get_or_create(
                email=ud['email'],
                defaults={
                    'username': ud['username'],
                    'is_active': True,
                }
            )
            user.set_password(ud['password'])
            user.save()

            profile, _ = GamerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'in_game_id': ud['in_game_id'],
                    'points': ud['points'],
                    'vip_status': ud['points'] > Decimal('800.00'),
                }
            )

            if not profile.profile_picture:
                color = get_color(i + 1)
                img = create_placeholder_image(200, 200, color, ud['username'], 'PNG')
                profile.profile_picture.save(f'{ud["username"]}_{user.id}.png', img, save=True)

            created_users.append(user)
            status = 'created' if u_created else 'already exists (password updated)'
            self.stdout.write(self.style.SUCCESS(f'User "{ud["username"]}" {status}.'))

        all_users = [admin_user] + created_users

        # ── 3. Create Follower Relationships ───────────────────────────────
        for i, user in enumerate(created_users):
            # Each user follows admin
            user.following.get_or_create(following=admin_user)
            # Some mutual follows
            if i > 0:
                user.following.get_or_create(following=created_users[i - 1])
            if i < len(created_users) - 1:
                user.following.get_or_create(following=created_users[i + 1])
        self.stdout.write(self.style.SUCCESS('Follower relationships created.'))

        # ── 4. Create Forum Posts with Images ──────────────────────────────
        posts_data = [
            {
                'content': 'Hey gamers! Welcome to HubZone — the ultimate gaming community. Here you can participate in tournaments, chat with fellow gamers, and climb the leaderboards. Let the games begin!',
                'category': 'GENERAL',
                'author': admin_user,
            },
            {
                'content': 'The biggest Free Fire tournament of the year is here! Register now with an entry fee of ৳100 and compete for a prize pool of ৳50,000. Limited slots available!',
                'category': 'NEWS',
                'author': admin_user,
            },
            {
                'content': 'After grinding ranked for 3 seasons, here is my recommended loadout: Scar + MP40, pet Otter, and the Chrono active skill. This combo has given me a 65% win rate. What do you guys think?',
                'category': 'MOBILE',
                'author': created_users[0],
            },
            {
                'content': 'Sharing my strategy for rotating on Erangel. Always prioritize high ground, use vehicles for long rotations, and avoid open fields during zone 4+. Drop your tips below!',
                'category': 'MOBILE',
                'author': created_users[1],
            },
            {
                'content': 'Just finished building my new gaming rig! RTX 4090, i9-13900K, 64GB DDR5 RAM. Getting 240fps in Valorant and 144fps in Cyberpunk 2077 at 4K. AMA!',
                'category': 'PC',
                'author': created_users[2],
            },
            {
                'content': 'I am a Diamond III player looking for an active squad for ranked and tournaments. I main the role of entry fragger. DM me if interested!',
                'category': 'GENERAL',
                'author': created_users[3],
            },
            {
                'content': 'The new PUBG Mobile 3.0 update brings a revamped Miramar map, new weapon balancing, and improved anti-cheat. The graphics look amazing on high-end devices.',
                'category': 'NEWS',
                'author': created_users[4],
            },
            {
                'content': 'Here is my updated character tier list: S-Tier: Kelly, A-Tier: K, Hayato, B-Tier: Alok, D-Bee. Let me know if you agree or disagree!',
                'category': 'MOBILE',
                'author': created_users[5],
            },
            {
                'content': 'After testing 15 mice, here are my top picks: 1) Logitech G304, 2) Razer DeathAdder Essential, 3) SteelSeries Rival 3. All great for competitive gaming!',
                'category': 'PC',
                'author': created_users[6],
            },
            {
                'content': 'What an amazing tournament! 32 teams competed and the finals were intense. Congratulations to Team Phoenix for taking first place. GG to all participants!',
                'category': 'NEWS',
                'author': created_users[7],
            },
        ]

        created_posts = []
        for i, pd in enumerate(posts_data):
            post, p_created = ForumPost.objects.get_or_create(
                content=pd['content'],
                defaults={
                    'author': pd['author'],
                    'category': pd['category'],
                }
            )

            if not post.image:
                color = get_color(i)
                img = create_placeholder_image(800, 400, color, f'post_{i}', 'PNG')
                post.image.save(f'post_{post.id}_{i}.png', img, save=True)

            created_posts.append(post)
            status = 'created' if p_created else 'already exists'
            self.stdout.write(self.style.SUCCESS(f'Post "{pd["title"][:40]}..." {status}.'))

        # ── 5. Create Comments on Posts ────────────────────────────────────
        comments_data = [
            'Great post! Thanks for sharing.',
            'I totally agree with this!',
            'This is really helpful, keep it up!',
            'Nice one! Looking forward to more content.',
            'Wow, impressive!',
            'Can you share more details?',
            'This changed my perspective. Thanks!',
            'GG! Well played!',
        ]

        for post in created_posts:
            num_comments = random.randint(1, 4)
            for _ in range(num_comments):
                commenter = random.choice(all_users)
                content = random.choice(comments_data)
                Comment.objects.get_or_create(
                    post=post,
                    author=commenter,
                    content=content,
                )
        self.stdout.write(self.style.SUCCESS('Comments created on posts.'))

        # ── 6. Create Tournaments with Images ──────────────────────────────
        now = timezone.now()
        tournaments_data = [
            {
                'title': 'Free Fire World Championship 2026',
                'game_name': 'FREEFIRE',
                'description': 'The ultimate Free Fire tournament! 64 players battle it out for the grand prize. Solo squad format, best of 3 matches.',
                'entry_fee': Decimal('100.00'),
                'prize_pool': Decimal('50000.00'),
                'start_time': now + timedelta(days=7),
                'slots_available': 64,
                'rules': '1. No emulators allowed\n2. No teaming\n3. Must join Discord voice channel\n4. Disqualification for cheating',
            },
            {
                'title': 'PUBG Mobile Weekly Cup',
                'game_name': 'PUBG',
                'description': 'Weekly PUBG Mobile tournament for Squad mode. Erangel and Miramar maps. Top 3 teams win prizes!',
                'entry_fee': Decimal('50.00'),
                'prize_pool': Decimal('15000.00'),
                'start_time': now + timedelta(days=3),
                'slots_available': 48,
                'rules': '1. Squad mode only\n2. No killing teammates\n3. Must have Conqueror rank or above\n4. Fair play enforced',
            },
            {
                'title': 'Free Fire Rookie Challenge',
                'game_name': 'FREEFIRE',
                'description': 'A tournament for new and upcoming players. Bronze to Gold rank only. Great opportunity to win your first prize!',
                'entry_fee': Decimal('25.00'),
                'prize_pool': Decimal('5000.00'),
                'start_time': now + timedelta(days=2),
                'slots_available': 32,
                'rules': '1. Bronze to Gold rank only\n2. Solo mode\n3. No hacking or glitches\n4. Have fun!',
            },
            {
                'title': 'PUBG Mobile Pro League',
                'game_name': 'PUBG',
                'description': 'Professional PUBG Mobile league for top-tier players. Ace rank and above. Massive prize pool awaits!',
                'entry_fee': Decimal('200.00'),
                'prize_pool': Decimal('100000.00'),
                'start_time': now + timedelta(days=14),
                'slots_available': 96,
                'rules': '1. Ace rank or above required\n2. Squad mode\n3. 5 match series\n4. Strict anti-cheat monitoring',
            },
            {
                'title': 'Free Fire Friday Frenzy',
                'game_name': 'FREEFIRE',
                'description': 'Every Friday, a new Free Fire tournament! Clash Squad mode this week. Quick matches, instant prizes!',
                'entry_fee': Decimal('30.00'),
                'prize_pool': Decimal('8000.00'),
                'start_time': now + timedelta(days=5),
                'slots_available': 24,
                'rules': '1. Clash Squad mode\n2. First come first served\n3. Best of 5 rounds\n4. No rank restriction',
            },
            {
                'title': 'PUBG Mobile Solo Showdown',
                'game_name': 'PUBG',
                'description': 'Test your individual skills in this Solo-only PUBG tournament. Sanhok map. Last one standing wins!',
                'entry_fee': Decimal('75.00'),
                'prize_pool': Decimal('20000.00'),
                'start_time': now + timedelta(days=10),
                'slots_available': 50,
                'rules': '1. Solo mode only\n2. Sanhok map\n3. No rank restriction\n4. 3 matches, highest total points wins',
            },
        ]

        created_tournaments = []
        for i, td in enumerate(tournaments_data):
            tournament, t_created = Tournament.objects.get_or_create(
                title=td['title'],
                defaults={
                    'created_by': admin_user,
                    'game_name': td['game_name'],
                    'description': td['description'],
                    'entry_fee': td['entry_fee'],
                    'prize_pool': td['prize_pool'],
                    'start_time': td['start_time'],
                    'slots_available': td['slots_available'],
                    'rules': td['rules'],
                    'is_active': True,
                    'status': 'REGISTRATION_OPEN',
                }
            )

            if not tournament.tournament_image:
                color = get_color(i + 3)
                img = create_placeholder_image(1200, 600, color, f'tournament_{i}', 'PNG')
                tournament.tournament_image.save(f'tournament_{tournament.id}_{i}.png', img, save=True)

            created_tournaments.append(tournament)
            status = 'created' if t_created else 'already exists'
            self.stdout.write(self.style.SUCCESS(f'Tournament "{td["title"][:40]}..." {status}.'))

        # ── 7. Register Some Users for Tournaments ─────────────────────────
        for tournament in created_tournaments:
            num_participants = random.randint(2, min(6, len(all_users)))
            participants = random.sample(all_users, num_participants)
            for participant in participants:
                TournamentParticipant.objects.get_or_create(
                    tournament=tournament,
                    gamer=participant,
                    defaults={
                        'in_game_id': participant.gamer_profile.in_game_id or '',
                        'payment_status': random.choice(['PAID', 'PENDING', 'PAID']),
                    },
                )
            tournament.joined_slots = num_participants
            tournament.save()
        self.stdout.write(self.style.SUCCESS('Tournament participants registered.'))

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE('\n══════════════════════════════════════════'))
        self.stdout.write(self.style.SUCCESS('  Database seeding completed!'))
        self.stdout.write(self.style.NOTICE('══════════════════════════════════════════'))
        self.stdout.write(self.style.NOTICE(f'  Admin: {admin_email} / {admin_password}'))
        self.stdout.write(self.style.NOTICE(f'  Users created: {len(created_users)}'))
        self.stdout.write(self.style.NOTICE(f'  Posts created: {len(created_posts)}'))
        self.stdout.write(self.style.NOTICE(f'  Tournaments created: {len(created_tournaments)}'))
        self.stdout.write(self.style.NOTICE('══════════════════════════════════════════'))
