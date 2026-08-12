from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Create demo Admin, Sales and Employee users'

    def handle(self, *args, **options):
        users = [
            {
                'username': 'admin',
                'email': 'admin@nexacrm.com',
                'password': 'admin123',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': User.Role.ADMIN,
                'designation': 'Super Admin',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'ravi',
                'email': 'ravi@nexacrm.com',
                'password': 'sales123',
                'first_name': 'Ravi',
                'last_name': 'Kumar',
                'role': User.Role.SALES,
                'designation': 'Sales Executive',
            },
            {
                'username': 'anjali',
                'email': 'anjali@nexacrm.com',
                'password': 'employee123',
                'first_name': 'Anjali',
                'last_name': 'Sharma',
                'role': User.Role.EMPLOYEE,
                'designation': 'Employee',
            },
        ]

        for data in users:
            password = data.pop('password')
            user, created = User.objects.update_or_create(
                username=data['username'],
                defaults=data,
            )
            user.set_password(password)
            user.save()
            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{action}: {user.username} / {password}'))
