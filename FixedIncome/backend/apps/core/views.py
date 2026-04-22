import csv
import io
import uuid

import rest_framework
import rest_framework.parsers
from django.core.cache import cache
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.views import APIView, Response

from apps.core.utils.utils import decode_csv_file, parse_date

from .models import Bond, Issuer, Transaction, UserProfile
from .pagination import StandardResultsSetPagination
from .permissions import (
    CanCreateTransaction,
    CanImportExportBonds,
    CanWriteReferenceData,
    IsAdminRole,
    IsOwnerOrAdmin,
    user_role,
)
from .serializers import (
    BondSerializer,
    IssuerSerializer,
    MeSerializer,
    TransactionSerializer,
    UserSerializer,
)

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all().order_by("id")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Issuer
# ---------------------------------------------------------------------------


class IssuerListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        issuers = Issuer.objects.all().order_by("id")
        serializer = IssuerSerializer(issuers, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not CanWriteReferenceData().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = IssuerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IssuerDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        issuer = get_object_or_404(Issuer, pk=pk)
        serializer = IssuerSerializer(issuer)
        return Response(serializer.data)

    def patch(self, request, pk):
        if not CanWriteReferenceData().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        issuer = get_object_or_404(Issuer, pk=pk)
        serializer = IssuerSerializer(issuer, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        issuer = get_object_or_404(Issuer, pk=pk)
        issuer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Bond
# ---------------------------------------------------------------------------


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


class BondListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    pagination_class = StandardResultsSetPagination

    filterset_fields = {
        "isin": ["exact", "icontains"],
        "bond_type": ["exact", "icontains"],
        "face_value": ["exact", "gte", "lte"],
        "coupon_rate": ["exact", "gte", "lte"],
        "issue_date": ["exact", "gte", "lte"],
        "maturity_date": ["exact", "gte", "lte"],
        "created_at": ["exact", "gte", "lte"],
        "updated_at": ["exact", "gte", "lte"],
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

    def get(self, request):
        queryset = Bond.objects.all().order_by("id")
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(request, queryset, self)

        paginator = self.pagination_class()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)
        serializer = BondSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not CanWriteReferenceData().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = BondSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BondDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        bond = get_object_or_404(Bond, pk=pk)
        serializer = BondSerializer(bond)
        return Response(serializer.data)

    def patch(self, request, pk):
        if not CanWriteReferenceData().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        bond = get_object_or_404(Bond, pk=pk)
        serializer = BondSerializer(bond, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        bond = get_object_or_404(Bond, pk=pk)
        bond.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Bonds/Bulk Delete
# ---------------------------------------------------------------------------


class BondBulkDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        if not IsAdminRole().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get("ids", [])
        Bond.objects.filter(id__in=ids).delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Bonds/Export CSV
# ---------------------------------------------------------------------------


class Echo:
    def write(self, value):
        return value


class BondExportCsvAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = {
        "isin": ["exact", "icontains"],
        "bond_type": ["exact", "icontains"],
        "face_value": ["exact", "gte", "lte"],
        "coupon_rate": ["exact", "gte", "lte"],
        "issue_date": ["exact", "gte", "lte"],
        "maturity_date": ["exact", "gte", "lte"],
        "created_at": ["exact", "gte", "lte"],
        "updated_at": ["exact", "gte", "lte"],
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

    def get(self, request):
        if not CanImportExportBonds().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        queryset = Bond.objects.all().select_related("issuer")

        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(request, queryset, self)

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


# ---------------------------------------------------------------------------
# Bonds/Import_Preview CSV
# ---------------------------------------------------------------------------


class BondImportPreviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [
        rest_framework.parsers.MultiPartParser
    ]  # Tells DRF to expect multipart/form-data (files)

    def post(self, request):
        if not CanImportExportBonds().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = decode_csv_file(file_obj)
            csv_isins = [r.get("ISIN") for r in reader if r.get("ISIN")]
        except Exception as e:
            return Response({"error": {str(e)}}, status=400)

        total_rows = len(csv_isins)
        existing_count = Bond.objects.filter(isin__in=csv_isins).count()
        new_rows = total_rows - existing_count

        return Response(
            {"total": total_rows, "new": new_rows, "existing": existing_count}
        )


# ---------------------------------------------------------------------------
# Bonds/Import CSV
# ---------------------------------------------------------------------------


class BondImportCsvAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [rest_framework.parsers.MultiPartParser]

    def post(self, request):
        if not CanImportExportBonds().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = list(decode_csv_file(file_obj))
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        to_create = []
        to_update = []  # list of (bond_instance, fields_to_update)
        skipped_rows = []

        existing_issuers = {i.name: i for i in Issuer.objects.all()}

        # Fetch all existing bonds that appear in the CSV upfront,
        # so we can diff against them without hitting the DB in the loop.
        all_isns = [r.get("ISIN") for r in reader if r.get("ISIN")]
        existing_bonds = {b.isin: b for b in Bond.objects.filter(isin__in=all_isns)}

        with transaction.atomic():
            for r in reader:
                isin = r.get("ISIN")
                issuer_name = r.get("Issuer")

                if not issuer_name or not isin:
                    skipped_rows.append(
                        {"isin": isin, "errors": "ISIN or Issuer is not specified"}
                    )
                    continue

                # --- Resolve issuer ---
                raw_industry = r.get("Industry")
                raw_rating = r.get("Rating")
                raw_type = r.get("Type")
                country = r.get("Country")

                if issuer_name not in existing_issuers:
                    issuer_obj, _ = Issuer.objects.get_or_create(
                        name=issuer_name,
                        defaults={
                            "country": country or "Other",
                            "industry": INDUSTRY_MAP.get(raw_industry, "Other"),
                            "credit_rating": RATING_MAP.get(raw_rating, "BBB"),
                        },
                    )
                    existing_issuers[issuer_name] = issuer_obj

                # --- Parse dates only if provided ---
                try:
                    issue_date = (
                        parse_date(r.get("Issue Date"))
                        if r.get("Issue Date", "").strip()
                        else None
                    )
                    maturity_date = (
                        parse_date(r.get("Maturity Date"))
                        if r.get("Maturity Date", "").strip()
                        else None
                    )
                except ValueError as e:
                    skipped_rows.append({"isin": isin, "errors": str(e)})
                    continue

                # --- Patch existing bond ---
                if isin in existing_bonds:
                    bond = existing_bonds[isin]
                    updated_fields = []

                    # Only update fields that were explicitly provided in the CSV row
                    if issuer_name:
                        bond.issuer = existing_issuers[issuer_name]
                        updated_fields.append("issuer")
                    if raw_type:
                        bond.bond_type = BOND_TYPE_MAP.get(raw_type, "CORP")
                        updated_fields.append("bond_type")
                    if r.get("Face Value", "").strip():
                        bond.face_value = r.get("Face Value")
                        updated_fields.append("face_value")
                    if r.get("Coupon", "").strip():
                        bond.coupon_rate = r.get("Coupon")
                        updated_fields.append("coupon_rate")
                    if issue_date:
                        bond.issue_date = issue_date
                        updated_fields.append("issue_date")
                    if maturity_date:
                        bond.maturity_date = maturity_date
                        updated_fields.append("maturity_date")

                    try:
                        bond.full_clean(validate_unique=False)
                    except ValidationError as e:
                        skipped_rows.append({"isin": isin, "errors": e.message_dict})
                        continue

                    to_update.append((bond, updated_fields))

                # --- Create new bond ---
                else:
                    # For new bonds all fields are required — no existing data to fall back on
                    missing = [
                        f
                        for f, v in {
                            "Face Value": r.get("Face Value", "").strip(),
                            "Coupon": r.get("Coupon", "").strip(),
                            "Issue Date": r.get("Issue Date", "").strip(),
                            "Maturity Date": r.get("Maturity Date", "").strip(),
                        }.items()
                        if not v
                    ]
                    if missing:
                        skipped_rows.append(
                            {
                                "isin": isin,
                                "errors": f"Missing required fields for new bond: {', '.join(missing)}",
                            }
                        )
                        continue

                    bond = Bond(
                        isin=isin,
                        issuer=existing_issuers[issuer_name],
                        bond_type=BOND_TYPE_MAP.get(raw_type, "CORP"),
                        face_value=r.get("Face Value"),
                        coupon_rate=r.get("Coupon"),
                        issue_date=issue_date,
                        maturity_date=maturity_date,
                    )

                    try:
                        bond.full_clean(validate_unique=False)
                    except ValidationError as e:
                        skipped_rows.append({"isin": isin, "errors": e.message_dict})
                        continue

                    to_create.append(bond)

            # Bulk create new bonds
            Bond.objects.bulk_create(to_create, batch_size=1000)

            # Bulk update existing bonds — group by which fields changed to minimise queries
            fields_map = {}  # frozenset(fields) -> [bond]
            for bond, fields in to_update:
                key = frozenset(fields)
                fields_map.setdefault(key, []).append(bond)

            for fields, bonds in fields_map.items():
                Bond.objects.bulk_update(bonds, fields=list(fields), batch_size=1000)

        total = len(to_create) + len(to_update)
        skipped_csv_url = None
        if skipped_rows:
            csv_buffer = io.StringIO()
            writer = csv.DictWriter(csv_buffer, fieldnames=["ISIN", "Error"])
            writer.writeheader()
            for skipped in skipped_rows:
                errors = skipped.get("errors", "")
                if isinstance(errors, dict):
                    error_message = "; ".join(
                        [f"{field}: {', '.join(messages)}" for field, messages in errors.items()]
                    )
                else:
                    error_message = str(errors)
                writer.writerow(
                    {
                        "ISIN": skipped.get("isin", ""),
                        "Error": error_message,
                    }
                )
            token = str(uuid.uuid4())
            cache.set(f"bond_import_skipped_{token}", csv_buffer.getvalue(), timeout=3600)
            skipped_csv_url = request.build_absolute_uri(
                f"/bonds/import_csv/skipped/{token}/"
            )

        return Response(
            {
                "message": "Upload complete!",
                "total_rows": total + len(skipped_rows),
                "created_count": len(to_create),
                "updated_count": len(to_update),
                "skipped_count": len(skipped_rows),
                "skipped": skipped_rows,
                "skipped_csv_url": skipped_csv_url,
            },
            status=201,
        )


class BondImportSkippedCsvDownloadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        if not CanImportExportBonds().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)

        cache_key = f"bond_import_skipped_{token}"
        csv_content = cache.get(cache_key)
        if not csv_content:
            return Response({"error": "Skipped CSV file not found or expired."}, status=404)

        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="skipped_bonds_{token[:8]}.csv"'
        )
        return response


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------


class TransactionListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = user_role(request.user)
        transactions = Transaction.objects.all().order_by("id")
        if role != UserProfile.ROLE_ADMIN:
            transactions = transactions.filter(user=request.user)
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not CanCreateTransaction().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(transaction)
        return Response(serializer.data)

    def patch(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(transaction, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            return Response(status=status.HTTP_403_FORBIDDEN)
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# meta
# ---------------------------------------------------------------------------


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
