import csv
import io
import logging
import uuid

import rest_framework
import rest_framework.parsers
from django.contrib.auth.models import User
from django.core.cache import cache
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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("User list forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all().order_by("id")
        serializer = UserSerializer(users, many=True)
        logger.info(
            "User list retrieved",
            extra={"user_id": request.user.id, "count": len(serializer.data)},
        )
        return Response(serializer.data)

    def post(self, request):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("User create forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(
                "User created",
                extra={
                    "user_id": request.user.id,
                    "created_user_id": serializer.data.get("id"),
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.warning(
            "User create validation failed",
            extra={"user_id": request.user.id},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("User detail forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        logger.info(
            "User detail retrieved",
            extra={"user_id": request.user.id, "target_user_id": pk},
        )
        return Response(serializer.data)

    def patch(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("User update forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            logger.info(
                "User updated",
                extra={"user_id": request.user.id, "target_user_id": pk},
            )
            return Response(serializer.data)
        logger.warning(
            "User update validation failed",
            extra={"user_id": request.user.id, "target_user_id": pk},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("User delete forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        user.delete()
        logger.info(
            "User deleted",
            extra={"user_id": request.user.id, "target_user_id": pk},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        logger.info("Me endpoint retrieved", extra={"user_id": request.user.id})
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Issuer
# ---------------------------------------------------------------------------


class IssuerListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        issuers = Issuer.objects.all().order_by("id")
        serializer = IssuerSerializer(issuers, many=True)
        logger.info(
            "Issuer list retrieved",
            extra={"user_id": request.user.id, "count": len(serializer.data)},
        )
        return Response(serializer.data)

    def post(self, request):
        if not CanWriteReferenceData().has_permission(request, self):
            logger.warning(
                "Issuer create forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = IssuerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(
                "Issuer created",
                extra={
                    "user_id": request.user.id,
                    "issuer_id": serializer.data.get("id"),
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.warning(
            "Issuer create validation failed", extra={"user_id": request.user.id}
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IssuerDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        issuer = get_object_or_404(Issuer, pk=pk)
        serializer = IssuerSerializer(issuer)
        logger.info(
            "Issuer detail retrieved",
            extra={"user_id": request.user.id, "issuer_id": pk},
        )
        return Response(serializer.data)

    def patch(self, request, pk):
        if not CanWriteReferenceData().has_permission(request, self):
            logger.warning(
                "Issuer update forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        issuer = get_object_or_404(Issuer, pk=pk)
        serializer = IssuerSerializer(issuer, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            logger.info(
                "Issuer updated",
                extra={"user_id": request.user.id, "issuer_id": pk},
            )
            return Response(serializer.data)
        logger.warning(
            "Issuer update validation failed",
            extra={"user_id": request.user.id, "issuer_id": pk},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            logger.warning(
                "Issuer delete forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        issuer = get_object_or_404(Issuer, pk=pk)
        issuer.delete()
        logger.info(
            "Issuer deleted",
            extra={"user_id": request.user.id, "issuer_id": pk},
        )
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
        logger.info(
            "Bond list retrieved",
            extra={"user_id": request.user.id, "count": len(serializer.data)},
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not CanWriteReferenceData().has_permission(request, self):
            logger.warning("Bond create forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = BondSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(
                "Bond created",
                extra={
                    "user_id": request.user.id,
                    "bond_id": serializer.data.get("id"),
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.warning(
            "Bond create validation failed", extra={"user_id": request.user.id}
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BondDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        bond = get_object_or_404(Bond, pk=pk)
        serializer = BondSerializer(bond)
        logger.info(
            "Bond detail retrieved", extra={"user_id": request.user.id, "bond_id": pk}
        )
        return Response(serializer.data)

    def patch(self, request, pk):
        if not CanWriteReferenceData().has_permission(request, self):
            logger.warning("Bond update forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        bond = get_object_or_404(Bond, pk=pk)
        serializer = BondSerializer(bond, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(
                "Bond updated", extra={"user_id": request.user.id, "bond_id": pk}
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        logger.warning(
            "Bond update validation failed",
            extra={"user_id": request.user.id, "bond_id": pk},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsAdminRole().has_permission(request, self):
            logger.warning("Bond delete forbidden", extra={"user_id": request.user.id})
            return Response(status=status.HTTP_403_FORBIDDEN)
        bond = get_object_or_404(Bond, pk=pk)
        bond.delete()
        logger.info("Bond deleted", extra={"user_id": request.user.id, "bond_id": pk})
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Bonds/Bulk Delete
# ---------------------------------------------------------------------------


class BondBulkDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        if not IsAdminRole().has_permission(request, self):
            logger.warning(
                "Bond bulk delete forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get("ids", [])
        Bond.objects.filter(id__in=ids).delete()
        logger.info(
            "Bond bulk delete completed",
            extra={"user_id": request.user.id, "requested_count": len(ids)},
        )
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
            logger.warning(
                "Bond CSV export forbidden",
                extra={"user_id": request.user.id},
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        queryset = Bond.objects.all().select_related("issuer")

        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(request, queryset, self)

        export_count = queryset.count()
        logger.info(
            "Bond CSV export started",
            extra={"user_id": request.user.id, "row_count": export_count},
        )

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
        logger.info(
            "Bond CSV export response created",
            extra={"user_id": request.user.id, "row_count": export_count},
        )
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
            logger.warning(
                "Bond CSV preview forbidden",
                extra={"user_id": request.user.id},
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        file_obj = request.FILES.get("file")
        if not file_obj:
            logger.warning(
                "Bond CSV preview missing file",
                extra={"user_id": request.user.id},
            )
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            logger.warning(
                "Bond CSV preview invalid file extension",
                extra={"user_id": request.user.id, "upload_filename": file_obj.name},
            )
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = decode_csv_file(file_obj)
            csv_isins = [r.get("ISIN") for r in reader if r.get("ISIN")]
        except Exception as e:
            logger.exception(
                "Bond CSV preview parse failed",
                extra={"user_id": request.user.id},
            )
            return Response({"error": {str(e)}}, status=400)

        total_rows = len(csv_isins)
        existing_count = Bond.objects.filter(isin__in=csv_isins).count()
        new_rows = total_rows - existing_count
        logger.info(
            "Bond CSV preview completed",
            extra={
                "user_id": request.user.id,
                "total_rows": total_rows,
                "new_rows": new_rows,
                "existing_rows": existing_count,
            },
        )

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
            logger.warning(
                "Bond CSV import forbidden",
                extra={"user_id": request.user.id},
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        file_obj = request.FILES.get("file")
        if not file_obj:
            logger.warning(
                "Bond CSV import missing file",
                extra={"user_id": request.user.id},
            )
            return Response({"error": "No file uploaded"})
        elif not file_obj.name.endswith(".csv"):
            logger.warning(
                "Bond CSV import invalid file extension",
                extra={"user_id": request.user.id, "upload_filename": file_obj.name},
            )
            return Response({"error": "File must be .csv"}, status=400)

        try:
            reader = list(decode_csv_file(file_obj))
        except Exception as e:
            logger.exception(
                "Bond CSV import parse failed",
                extra={"user_id": request.user.id},
            )
            return Response({"error": str(e)}, status=400)

        to_create = []
        to_update = []  # list of (bond_instance, fields_to_update)
        skipped_rows = []
        logger.info(
            "Bond CSV import started",
            extra={"user_id": request.user.id, "csv_rows": len(reader)},
        )

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
                    logger.warning(
                        "Bond CSV import row skipped due to invalid date",
                        extra={"user_id": request.user.id, "isin": isin},
                    )
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
                        logger.warning(
                            "Bond CSV import row skipped due to update validation error",
                            extra={"user_id": request.user.id, "isin": isin},
                        )
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
                        logger.warning(
                            "Bond CSV import row skipped due to create validation error",
                            extra={"user_id": request.user.id, "isin": isin},
                        )
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
                        [
                            f"{field}: {', '.join(messages)}"
                            for field, messages in errors.items()
                        ]
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
            cache.set(
                f"bond_import_skipped_{token}", csv_buffer.getvalue(), timeout=3600
            )
            skipped_csv_url = request.build_absolute_uri(
                f"/bonds/import_csv/skipped/{token}/"
            )

        logger.info(
            "Bond CSV import completed",
            extra={
                "user_id": request.user.id,
                "created_count": len(to_create),
                "updated_count": len(to_update),
                "skipped_count": len(skipped_rows),
            },
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
            logger.warning(
                "Skipped CSV download forbidden",
                extra={"user_id": request.user.id},
            )
            return Response(status=status.HTTP_403_FORBIDDEN)

        cache_key = f"bond_import_skipped_{token}"
        csv_content = cache.get(cache_key)
        if not csv_content:
            logger.warning(
                "Skipped CSV download token missing or expired",
                extra={"user_id": request.user.id},
            )
            return Response(
                {"error": "Skipped CSV file not found or expired."}, status=404
            )

        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="skipped_bonds_{token[:8]}.csv"'
        )
        logger.info("Skipped CSV downloaded", extra={"user_id": request.user.id})
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
        logger.info(
            "Transaction list retrieved",
            extra={"user_id": request.user.id, "count": len(serializer.data)},
        )
        return Response(serializer.data)

    def post(self, request):
        if not CanCreateTransaction().has_permission(request, self):
            logger.warning(
                "Transaction create forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            logger.info(
                "Transaction created",
                extra={
                    "user_id": request.user.id,
                    "transaction_id": serializer.data.get("id"),
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.warning(
            "Transaction create validation failed",
            extra={"user_id": request.user.id},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            logger.warning(
                "Transaction detail forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(transaction)
        logger.info(
            "Transaction detail retrieved",
            extra={"user_id": request.user.id, "transaction_id": pk},
        )
        return Response(serializer.data)

    def patch(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            logger.warning(
                "Transaction update forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = TransactionSerializer(transaction, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            logger.info(
                "Transaction updated",
                extra={"user_id": request.user.id, "transaction_id": pk},
            )
            return Response(serializer.data)
        logger.warning(
            "Transaction update validation failed",
            extra={"user_id": request.user.id, "transaction_id": pk},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        if not IsOwnerOrAdmin().has_object_permission(request, self, transaction):
            logger.warning(
                "Transaction delete forbidden", extra={"user_id": request.user.id}
            )
            return Response(status=status.HTTP_403_FORBIDDEN)
        transaction.delete()
        logger.info(
            "Transaction deleted",
            extra={"user_id": request.user.id, "transaction_id": pk},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# meta
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def meta(request):
    logger.info("Meta endpoint retrieved", extra={"user_id": request.user.id})
    return Response(
        {
            "credit_ratings": [{"id": k, "name": v} for k, v in Issuer.RATING_CHOICES],
            "industries": [{"id": k, "name": v} for k, v in Issuer.INDUSTRY_CHOICES],
            "bond_types": [{"id": k, "name": v} for k, v in Bond.TYPE_CHOICES],
        }
    )
