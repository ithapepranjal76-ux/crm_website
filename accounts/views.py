from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .models import User


def landing(request):
    if request.user.is_authenticated:
        return redirect('role_redirect')
    return render(request, 'landing/index.html')


def _resolve_user(login_id, password):
    """Accept username or email (case-insensitive)."""
    login_id = (login_id or '').strip()
    if not login_id or not password:
        return None

    # Direct username auth
    user = authenticate(username=login_id, password=password)
    if user is not None:
        return user

    # Case-insensitive username / email lookup
    found = User.objects.filter(
        Q(username__iexact=login_id) | Q(email__iexact=login_id)
    ).first()
    if found:
        user = authenticate(username=found.username, password=password)
        if user is not None:
            return user
    return None


@require_http_methods(['GET', 'POST'])
def login_view(request):
    # Allow switching accounts: if POST with different credentials, logout first
    if request.method == 'POST':
        if request.user.is_authenticated:
            logout(request)

        login_id = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        remember = request.POST.get('remember')

        user = _resolve_user(login_id, password)
        if user is not None:
            login(request, user)
            if not remember:
                request.session.set_expiry(0)
            return redirect('role_redirect')
        error = 'Invalid email/username or password. Try: ravi / sales123 or anjali / employee123'
        return render(request, 'auth/login.html', {'error': error})

    # GET — if already logged in, still show login so user can switch role
    return render(request, 'auth/login.html', {
        'error': None,
        'current_user': request.user if request.user.is_authenticated else None,
    })


@login_required
def role_redirect(request):
    role = getattr(request.user, 'role', None)
    if request.user.is_superuser or role == User.Role.ADMIN or role == 'admin':
        return redirect('admin_dashboard')
    if role == User.Role.SALES or role == 'sales':
        return redirect('sales_dashboard')
    return redirect('employee_dashboard')


def logout_view(request):
    logout(request)
    messages.success(request, 'Signed out successfully.')
    return redirect('login')
