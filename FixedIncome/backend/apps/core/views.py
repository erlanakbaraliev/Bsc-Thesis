import csv

from django.contrib.auth.models import User
from django.http import StreamingHttpResponse
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


class Echo:
    def write(self, value):
        return value


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
        "created_at": ["exact", "gte", "lte", "icontains"],
        "updated_at": ["exact", "gte", "lte", "icontains"],
        "issuer__name": ["exact", "icontains"],
        "issuer__country": ["exact", "icontains"],
        "issuer__credit_rating": ["exact"],
        "issuer__industry": ["exact", "icontains"],
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
        "created_at",
        "updated_at",
        "issuer__name",
        "issuer__country",
        "issuer__credit_rating",
        "issuer__industry",
    ]

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        Bond.objects.filter(id__in=ids).delete()
        return Response(status=204)

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        # This applies all your Search, Ordering, and DjangoFilters automatically!
        queryset = self.filter_queryset(self.get_queryset()).select_related("issuer")

        def row_generator():
            echo = Echo()
            writer = csv.writer(echo)

            yield writer.writerow(
                [
                    "ISIN",
                    "Issuer",
                    "Country",
                    "Rating",
                    "Type",
                    "Face Value",
                    "Coupon",
                    "Issue Date",
                    "Maturity Date",
                ]
            )

            # .iterator() ensures we don't crash the server with millions of rows
            for bond in queryset.iterator(chunk_size=2000):
                yield writer.writerow(
                    [
                        bond.isin,
                        bond.issuer.name,
                        bond.issuer.country,
                        bond.issuer.get_credit_rating_display(),  # Use display name
                        bond.get_bond_type_display(),
                        bond.face_value,
                        bond.coupon_rate,
                        bond.issue_date,
                        bond.maturity_date,
                    ]
                )

        response = StreamingHttpResponse(row_generator(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="bonds_export.csv"'
        return response


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
