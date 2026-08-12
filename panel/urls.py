from django.urls import path
from . import views

urlpatterns = [
    path('action/create/', views.create_item, name='create_item'),

    # Admin
    path('admin-panel/', views.admin_dashboard, name='admin_dashboard'),
    path('admin-panel/<slug:slug>/', views.admin_page, name='admin_page'),

    # Sales
    path('sales/', views.sales_dashboard, name='sales_dashboard'),
    path('sales/<slug:slug>/', views.sales_page, name='sales_page'),

    # Employee
    path('employee/', views.employee_dashboard, name='employee_dashboard'),
    path('employee/<slug:slug>/', views.employee_page, name='employee_page'),
]
