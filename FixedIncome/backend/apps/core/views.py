import csv

import rest_framework
import rest_framework.parsers
from django.contrib.auth.models import User
from django.db import transaction
from django.http import StreamingHttpResponse
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
from .permissions import (
    CanCreateTransaction,
    CanImportExportBonds,
    CanWriteReferenceData,
    IsAdminRole,
    IsOwnerOrAdmin,
    user_role,
)
from .pagination import StandardResultsSetPagination
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
# Bonds/Export CSV
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
            return Response({"error": str(e)}, status=400)

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
