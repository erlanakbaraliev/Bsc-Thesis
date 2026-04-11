import csv
import io

from django.contrib.auth.models import User
from django.http import StreamingHttpResponse
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.views import Response
from rest_framework.response import Response
import rest_framework.parsers

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
    
    @action(detail=False, methods=['post'], parser_classes=[rest_framework.parsers.MultiPartParser])
    def import_preview(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)

        try:
            decoded_file = file_obj.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded_file))
            # Extract just the ISINs from the CSV to check them
            csv_isins = [row.get('ISIN') for row in reader if row.get('ISIN')]
        except Exception as e:
            return Response({"error": f"Invalid CSV: {str(e)}"}, status=400)

        total_rows = len(csv_isins)
        # Query the database to see how many of these ISINs already exist
        existing_count = Bond.objects.filter(isin__in=csv_isins).count()
        new_count = total_rows - existing_count

        return Response({
            "total": total_rows,
            "new": new_count,
            "existing": existing_count
        }, status=200)

    # 2. THE ACTUAL IMPORT ENDPOINT (Level 2 Upsert)
    @action(detail=False, methods=['post'], parser_classes=[rest_framework.parsers.MultiPartParser])
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)

        try:
            decoded_file = file_obj.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded_file))
        except Exception as e:
            return Response({"error": f"Invalid CSV: {str(e)}"}, status=400)

        new_bonds = []
        existing_issuers = {issuer.name: issuer for issuer in Issuer.objects.all()}

        with transaction.atomic():
            for row in reader:
                issuer_name = row.get('Issuer')
                if not issuer_name or not row.get('ISIN'):
                    continue # Skip empty or highly invalid rows
                
                if issuer_name not in existing_issuers:
                    new_issuer = Issuer.objects.create(
                        name=issuer_name, 
                        country=row.get('Country', 'Unknown'),
                        industry="Other", # -- NOTE:
                        credit_rating=row.get('Rating')
                    )
                    existing_issuers[issuer_name] = new_issuer

                bond = Bond(
                    isin=row.get('ISIN'),
                    issuer=existing_issuers[issuer_name],
                    bond_type=row.get('Type', 'CORP'),
                    face_value=row.get('Face Value', 1000),
                    coupon_rate=row.get('Coupon', 0),
                    issue_date=row.get('Issue Date'),
                    maturity_date=row.get('Maturity Date')
                )
                new_bonds.append(bond)

            # The Magic Upsert! (Requires Django 4.1+)
            Bond.objects.bulk_create(
                new_bonds,
                update_conflicts=True,
                unique_fields=['isin'], # If ISIN matches...
                update_fields=[         # ...update these fields instead of failing
                    'bond_type', 'face_value', 'coupon_rate', 
                    'issue_date', 'maturity_date'
                ] 
            )

        return Response({
            "message": "Upload complete!"
        }, status=201)


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
