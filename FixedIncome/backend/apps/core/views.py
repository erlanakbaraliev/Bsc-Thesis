from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.views import Response

from .models import Bond, Issuer, Transaction
from .serializers import (
    BondSerializer,
    IssuerSerializer,
    TransactionSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class IssuerViewSet(viewsets.ModelViewSet):
    queryset = Issuer.objects.all().order_by("id")
    serializer_class = IssuerSerializer
    permission_classes = [permissions.AllowAny]


class BondViewSet(viewsets.ModelViewSet):
    queryset = Bond.objects.all().order_by("id")
    serializer_class = BondSerializer
    permission_classes = [permissions.AllowAny]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "isin": ["exact", "icontains"],
        "bond_type": ["exact", "icontains"],
        "face_value": ["exact", "gte", "lte"],
        "coupon_rate": ["exact", "gte", "lte"],
        "issue_date": ["exact", "gte", "lte"],
        "maturity_date": ["exact", "gte", "lte", "icontains"],
        "issuer__name": ["exact", "icontains", "icontains"],
        "issuer__country": ["exact", "icontains"],
        "issuer__credit_rating": ["exact"],
    }
    ordering = ["id"]  # Default order column
    search_fields = ["isin"]
    ordering_fields = [
        "isin",
        "bond_type",
        "face_value",
        "coupon_rate",
        "issue_date",
        "maturity_date",
        "issuer__name",
        "issuer__country",
        "issuer__credit_rating",
    ]

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        Bond.objects.filter(id__in=ids).delete()
        return Response(status=204)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by("id")
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def meta(request):
    return Response(
        {
            "credit_ratings": [{"id": k, "name": v} for k, v in Issuer.RATING_CHOICES],
            "industries": [{"id": k, "name": v} for k, v in Issuer.INDUSTRY_CHOICES],
            "bond_types": [{"id": k, "name": v} for k, v in Bond.TYPE_CHOICES],
        }
    )
