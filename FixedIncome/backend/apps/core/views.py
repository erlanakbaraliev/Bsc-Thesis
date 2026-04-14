import csv

import rest_framework
import rest_framework.parsers
from django.contrib.auth.models import User
from django.db import transaction
from django.http import StreamingHttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
)
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.views import Response

from apps.core.utils.utils import decode_csv_file, parse_date

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
    permission_classes = [permissions.IsAuthenticated]


class IssuerViewSet(viewsets.ModelViewSet):
    queryset = Issuer.objects.all().order_by("id")
    serializer_class = IssuerSerializer
    permission_classes = [permissions.IsAuthenticated]


class Echo:
    def write(self, value):
        return value


INDUSTRY_MAP = {
    "Telecom": "Communication Services",
    "Energy": "Energy",
    "Materials": "Materials",
    "Industrial": "Industrials",
    "Financials": "Financials",
    "Technology": "Technology",
    "Healthcare": "Healthcare",
    "Utilities": "Utilities",
    "Government": "Government",
    "Real Estate": "Real Estate",
    "Consumer Discretionary": "Consumer Discretionary",
    "Consumer Staples": "Consumer Staples",
    "Communication Services": "Communication Services",
    "Other": "Other",
}

RATING_MAP = {
    "Prime (AAA)": "AAA",
    "High Grade (AA)": "AA",
    "Upper Medium Grade (A)": "A",
    "Lower Medium Grade (BBB)": "BBB",
    "Non-Investment Grade (BB)": "BB",
    "Highly Speculative (B)": "C",
    "Substantial Risk (CCC)": "C",
}

BOND_TYPE_MAP = {
    "Corporate": "CORP",
    "Government": "GOV",
    "Municipal": "MUNI",
    "Convertible": "CORP",
    "Zero Coupon": "CORP",
    "Floating Rate": "CORP",
    "Callable": "CORP",
}


class BondViewSet(viewsets.ModelViewSet):
    queryset = Bond.objects.all().order_by("id")
    serializer_class = BondSerializer
    permission_classes = [permissions.IsAuthenticated]

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

    @action(
        detail=False,
        methods=["post"],
        parser_classes=[rest_framework.parsers.MultiPartParser],
    )
    def import_preview(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = decode_csv_file(file_obj)
            csv_isins = [r.get("ISIN") for r in reader if r.get("ISIN")]
            for r in reader:
                print(r)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        total_rows = len(csv_isins)
        existing_count = Bond.objects.filter(isin__in=csv_isins).count()
        new_rows = total_rows - existing_count

        return Response(
            {"total": total_rows, "new": new_rows, "existing": existing_count}
        )

    @action(
        detail=False,
        methods=["post"],
        parser_classes=[rest_framework.parsers.MultiPartParser],
    )
    def import_csv(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = decode_csv_file(file_obj)
        except Exception as e:
            return Response({"error": {str(e)}}, status=400)

        new_bonds = []
        existing_issuers = {i.name: i for i in Issuer.objects.all()}

        with transaction.atomic():
            for r in reader:
                issuer_name = r.get("Issuer")
                if not issuer_name or not r.get("ISIN"):
                    continue

                raw_industry = r.get("Industry", "Other")
                raw_rating = r.get("Rating", "Lower Medium Grade (BBB)")
                raw_type = r.get("Type", "Corporate")

                country = r.get("Country", "Other")
                industry = INDUSTRY_MAP.get(raw_industry, "Other")
                rating = RATING_MAP.get(raw_rating, "BBB")

                if issuer_name not in existing_issuers:
                    issuer_obj, _ = Issuer.objects.get_or_create(
                        name=issuer_name,
                        defaults={
                            "country": country,
                            "industry": industry,
                            "credit_rating": rating,
                        },
                    )
                    existing_issuers[issuer_name] = issuer_obj

                try:
                    issue_date = parse_date(r.get("Issue Date", ""))
                    maturity_date = parse_date(r.get("Maturity Date"))
                except ValueError:
                    continue  # skip rows with invalid date format.

                bond = Bond(
                    isin=r.get("ISIN"),
                    issuer=existing_issuers[issuer_name],
                    bond_type=BOND_TYPE_MAP.get(raw_type, "CORP"),
                    face_value=r.get("Face Value", 0),
                    coupon_rate=r.get("Coupon", 0),
                    issue_date=issue_date,
                    maturity_date=maturity_date,
                )
                new_bonds.append(bond)

            Bond.objects.bulk_create(
                new_bonds,
                1000,
                unique_fields=["isin"],
                update_conflicts=True,
                update_fields=[
                    "issuer",
                    "bond_type",
                    "face_value",
                    "coupon_rate",
                    "issue_date",
                    "maturity_date",
                ],
            )
        return Response({"message": "Upload complete!"}, status=201)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by("id")
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def meta(request):
    return Response(
        {
            "credit_ratings": [{"id": k, "name": v} for k, v in Issuer.RATING_CHOICES],
            "industries": [{"id": k, "name": v} for k, v in Issuer.INDUSTRY_CHOICES],
            "bond_types": [{"id": k, "name": v} for k, v in Bond.TYPE_CHOICES],
        }
    )
