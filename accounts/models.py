from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        SALES = 'sales', 'Sales Executive'
        EMPLOYEE = 'employee', 'Employee'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    designation = models.CharField(max_length=80, blank=True)

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'
