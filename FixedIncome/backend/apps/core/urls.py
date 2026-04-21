from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.core import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("api/meta/", views.meta),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/me/", views.MeAPIView.as_view(), name="user-me"),
    path("users/", views.UserListCreateAPIView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", views.UserDetailAPIView.as_view(), name="user-detail"),
    path(
        "transactions/",
        views.TransactionListCreateAPIView.as_view(),
        name="transaction-list-create",
    ),
    path(
        "transactions/<int:pk>/",
        views.TransactionDetailAPIView.as_view(),
        name="transaction-detail",
    ),
    path(
        "issuers/", views.IssuerListCreateAPIView.as_view(), name="issuer-list-create"
    ),
    path(
        "issuers/<int:pk>/", views.IssuerDetailAPIView.as_view(), name="issuer-detail"
    ),
    path("bonds/", views.BondListCreateAPIView.as_view(), name="bond-list-create"),
    path("bonds/<int:pk>/", views.BondDetailView.as_view(), name="bond-detail"),
    path(
        "bonds/bulk_delete/",
        views.BondBulkDeleteAPIView.as_view(),
        name="bond-bulk-delete",
    ),
    path(
        "bonds/export_csv/",
        views.BondExportCsvAPIView.as_view(),
        name="bond-export-csv",
    ),
    path(
        "bonds/import_preview/",
        views.BondImportPreviewAPIView.as_view(),
        name="bond-import-preview",
    ),
    path(
        "bonds/import_csv/",
        views.BondImportCsvAPIView.as_view(),
        name="bond-import-csv",
    ),
]
