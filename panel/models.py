from django.conf import settings
from django.db import models


class CrmItem(models.Model):
    class Kind(models.TextChoices):
        LEAD = 'lead', 'Lead'
        DEAL = 'deal', 'Deal'
        TASK = 'task', 'Task'
        CALL = 'call', 'Call'
        EMAIL = 'email', 'Email'
        CAMPAIGN = 'campaign', 'Campaign'
        NOTE = 'note', 'Note'
        CONTACT = 'contact', 'Contact'
        COMPANY = 'company', 'Company'
        APPOINTMENT = 'appointment', 'Appointment'
        REQUEST = 'request', 'Request'
        OTHER = 'other', 'Other'

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    title = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    status = models.CharField(max_length=40, default='Open')
    priority = models.CharField(max_length=20, default='Medium')
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='crm_items',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.kind}: {self.title}'
