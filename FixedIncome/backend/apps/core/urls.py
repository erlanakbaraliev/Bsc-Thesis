from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from apps.core import views

router = routers.DefaultRouter()
router.register(r"users", views.UserViewSet)
router.register(r"issuers", views.IssuerViewSet)
router.register(r"bonds", views.BondViewSet)
router.register(r"transactions", views.TransactionViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("api/meta/", views.meta),
    path("", include(router.urls)),
]
