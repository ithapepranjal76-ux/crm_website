from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from accounts import views as account_views

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('', account_views.landing, name='landing'),
    path('login/', account_views.login_view, name='login'),
    path('logout/', account_views.logout_view, name='logout'),
    path('go/', account_views.role_redirect, name='role_redirect'),
    path('', include('panel.urls')),
]

if settings.DEBUG:
    urlpatterns = [
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': str(settings.BASE_DIR / 'static')}),
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': str(settings.MEDIA_ROOT)}),
    ] + urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
