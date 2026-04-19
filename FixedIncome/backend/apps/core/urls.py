from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.core import views

router = routers.DefaultRouter()
router.register(r"bonds", views.BondViewSet)
router.register(r"transactions", views.TransactionViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("api/meta/", views.meta),
    path("", include(router.urls)),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "issuers/", views.IssuerListCreateAPIView.as_view(), name="issuer-list-create"
    ),
    path(
        "issuers/<int:pk>/", views.IssuerDetailAPIView.as_view(), name="issuer-detail"
    ),
    path("users/", views.UserListCreateAPIView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", views.UserDetailAPIView.as_view(), name="user-detail"),
]
