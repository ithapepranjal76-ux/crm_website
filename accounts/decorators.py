from functools import wraps
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


def role_required(*roles):
    def decorator(view_func):
        @login_required
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            if request.user.role not in roles and not request.user.is_superuser:
                return redirect('role_redirect')
            return view_func(request, *args, **kwargs)
        return _wrapped
    return decorator
