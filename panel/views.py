from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from accounts.decorators import role_required
from .models import CrmItem

SLUG_KIND = {
    'leads': CrmItem.Kind.LEAD,
    'contacts': CrmItem.Kind.CONTACT,
    'companies': CrmItem.Kind.COMPANY,
    'deals': CrmItem.Kind.DEAL,
    'pipeline': CrmItem.Kind.DEAL,
    'tasks': CrmItem.Kind.TASK,
    'appointments': CrmItem.Kind.APPOINTMENT,
    'campaigns': CrmItem.Kind.CAMPAIGN,
    'calls': CrmItem.Kind.CALL,
    'customers': CrmItem.Kind.CONTACT,
    'followups': CrmItem.Kind.TASK,
    'activities': CrmItem.Kind.NOTE,
    'requests': CrmItem.Kind.REQUEST,
    'notifications': CrmItem.Kind.OTHER,
    'profile': CrmItem.Kind.OTHER,
    'ai': CrmItem.Kind.OTHER,
    'reports': CrmItem.Kind.OTHER,
    'users': CrmItem.Kind.OTHER,
    'teams': CrmItem.Kind.OTHER,
    'settings': CrmItem.Kind.OTHER,
    'integrations': CrmItem.Kind.OTHER,
    'audit': CrmItem.Kind.OTHER,
    'documents': CrmItem.Kind.OTHER,
    'knowledge': CrmItem.Kind.OTHER,
    'directory': CrmItem.Kind.CONTACT,
    'approvals': CrmItem.Kind.REQUEST,
    'announcements': CrmItem.Kind.NOTE,
    'calendar': CrmItem.Kind.APPOINTMENT,
}


def _page(request, template, title, active, extra=None):
    ctx = {
        'page_title': title,
        'active': active,
        'user_obj': request.user,
    }
    if extra:
        ctx.update(extra)
    return render(request, template, ctx)


def _items_for_slug(slug):
    kind = SLUG_KIND.get(slug)
    if not kind or kind == CrmItem.Kind.OTHER:
        return CrmItem.objects.all()[:20]
    return CrmItem.objects.filter(kind=kind)[:50]


@role_required('admin')
def admin_dashboard(request):
    return _page(request, 'admin_panel/dashboard.html', 'Admin Panel', 'dashboard')


@role_required('admin')
def admin_page(request, slug):
    titles = {
        'leads': 'Leads',
        'contacts': 'Contacts',
        'companies': 'Companies',
        'deals': 'Deals',
        'pipeline': 'Pipeline',
        'tasks': 'Tasks',
        'appointments': 'Appointments',
        'campaigns': 'Campaigns',
        'calls': 'Calls',
        'reports': 'Reports',
        'ai': 'AI Assistant',
        'users': 'Users & Roles',
        'teams': 'Teams',
        'settings': 'Settings',
        'integrations': 'Integrations',
        'audit': 'Audit Logs',
    }
    title = titles.get(slug, slug.replace('-', ' ').title())
    kind = SLUG_KIND.get(slug, CrmItem.Kind.OTHER)
    return _page(
        request,
        'admin_panel/page.html',
        title,
        slug,
        {
            'slug': slug,
            'panel': 'admin',
            'items': _items_for_slug(slug),
            'default_kind': kind,
            'open_modal': request.GET.get('new') == '1',
        },
    )


@role_required('sales', 'admin')
def sales_dashboard(request):
    return _page(request, 'sales_panel/dashboard.html', 'Sales Executive Dashboard', 'dashboard')


@role_required('sales', 'admin')
def sales_page(request, slug):
    titles = {
        'leads': 'My Leads',
        'customers': 'My Customers',
        'deals': 'My Deals',
        'pipeline': 'Sales Pipeline',
        'activities': 'Activities',
        'tasks': 'Tasks',
        'calendar': 'Calendar',
        'followups': 'Follow-ups',
        'reports': 'Reports',
        'ai': 'AI Assistant',
        'notifications': 'Notifications',
        'profile': 'My Profile',
    }
    title = titles.get(slug, slug.replace('-', ' ').title())
    kind = SLUG_KIND.get(slug, CrmItem.Kind.OTHER)
    return _page(
        request,
        'sales_panel/page.html',
        title,
        slug,
        {
            'slug': slug,
            'panel': 'sales',
            'items': _items_for_slug(slug),
            'default_kind': kind,
            'open_modal': request.GET.get('new') == '1',
        },
    )


@role_required('employee', 'admin')
def employee_dashboard(request):
    return _page(request, 'employee_panel/dashboard.html', 'Employee Panel', 'dashboard')


@role_required('employee', 'admin')
def employee_page(request, slug):
    titles = {
        'tasks': 'My Tasks',
        'activities': 'My Activities',
        'calendar': 'Calendar',
        'requests': 'My Requests',
        'documents': 'Documents',
        'knowledge': 'Knowledge Base',
        'directory': 'Team Directory',
        'approvals': 'Approvals',
        'reports': 'Reports',
        'announcements': 'Announcements',
        'notifications': 'Notifications',
        'settings': 'Settings',
    }
    title = titles.get(slug, slug.replace('-', ' ').title())
    kind = SLUG_KIND.get(slug, CrmItem.Kind.OTHER)
    return _page(
        request,
        'employee_panel/page.html',
        title,
        slug,
        {
            'slug': slug,
            'panel': 'employee',
            'items': _items_for_slug(slug),
            'default_kind': kind,
            'open_modal': request.GET.get('new') == '1',
        },
    )


@login_required
@require_POST
def create_item(request):
    kind = request.POST.get('kind', CrmItem.Kind.OTHER)
    title = (request.POST.get('title') or '').strip()
    detail = (request.POST.get('detail') or '').strip()
    phone = (request.POST.get('phone') or '').strip()
    email = (request.POST.get('email') or '').strip()
    priority = request.POST.get('priority') or 'Medium'
    next_url = request.POST.get('next') or reverse('role_redirect')

    if not title:
        messages.error(request, 'Please enter a title / name.')
        return redirect(next_url)

    valid_kinds = {c.value for c in CrmItem.Kind}
    if kind not in valid_kinds:
        kind = CrmItem.Kind.OTHER

    CrmItem.objects.create(
        kind=kind,
        title=title,
        detail=detail,
        phone=phone,
        email=email,
        priority=priority,
        status='Open',
        created_by=request.user,
    )
    messages.success(request, f'Saved successfully: {title}')
    return redirect(next_url)
