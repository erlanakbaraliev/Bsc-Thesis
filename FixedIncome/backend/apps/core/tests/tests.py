import csv
import io

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Bond, Issuer, Transaction, UserProfile

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def auth_client(user: User, role: str = UserProfile.ROLE_ADMIN) -> APIClient:
    profile = user.profile
    if profile.role != role:
        profile.role = role
        profile.save(update_fields=["role"])
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def make_issuer(**kwargs) -> Issuer:
    defaults = dict(
        name="Test Issuer",
        country="HU",
        industry="Financials",
        credit_rating="BBB",
    )
    defaults.update(kwargs)
    return Issuer.objects.create(**defaults)


def make_bond(issuer: Issuer, **kwargs) -> Bond:
    defaults = dict(
        isin="US1234567890",
        bond_type="CORP",
        face_value="1000.00",
        coupon_rate="5.00",
        issue_date="2020-01-01",
        maturity_date="2030-01-01",
    )
    defaults.update(kwargs)
    return Bond.objects.create(issuer=issuer, **defaults)


def make_csv_bytes(rows: list[dict], fieldnames: list[str] | None = None) -> bytes:
    """Build a UTF-8 CSV byte-string from a list of dicts."""
    buf = io.StringIO()
    if not fieldnames:
        fieldnames = list(rows[0].keys()) if rows else []
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


# ---------------------------------------------------------------------------
# Model constraints
# ---------------------------------------------------------------------------


class ModelConstraintTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="constraint-user", password="pass")
        self.issuer = make_issuer(name="Constraint Issuer")
        self.bond = make_bond(self.issuer, isin="US0000000001")

    def test_issuer_name_must_be_unique(self):
        duplicate = Issuer(
            name="Constraint Issuer",
            country="US",
            industry="Technology",
            credit_rating="AA",
        )
        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_issuer_name_min_length_validator(self):
        issuer = Issuer(name="A", country="US", industry="Technology", credit_rating="AA")
        with self.assertRaises(ValidationError):
            issuer.full_clean()

    def test_bond_isin_regex_validator(self):
        bond = Bond(
            isin="INVALID-ISIN",
            issuer=self.issuer,
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="5.00",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )
        with self.assertRaises(ValidationError):
            bond.full_clean()

    def test_bond_date_constraint_maturity_after_issue(self):
        bond = Bond(
            isin="US0000000002",
            issuer=self.issuer,
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="5.00",
            issue_date="2030-01-01",
            maturity_date="2020-01-01",
        )
        with self.assertRaises(ValidationError):
            bond.full_clean()

    def test_bond_face_value_must_be_positive(self):
        bond = Bond(
            isin="US0000000003",
            issuer=self.issuer,
            bond_type="CORP",
            face_value="0.00",
            coupon_rate="5.00",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )
        with self.assertRaises(ValidationError):
            bond.full_clean()

    def test_bond_coupon_rate_range(self):
        below = Bond(
            isin="US0000000004",
            issuer=self.issuer,
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="-0.01",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )
        above = Bond(
            isin="US0000000005",
            issuer=self.issuer,
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="100.01",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )

        with self.assertRaises(ValidationError):
            below.full_clean()
        with self.assertRaises(ValidationError):
            above.full_clean()

    def test_transaction_quantity_must_be_positive(self):
        tx = Transaction(
            user=self.user,
            bond=self.bond,
            action="BUY",
            quantity=0,
            price="100.00",
        )
        with self.assertRaises(ValidationError):
            tx.full_clean()

    def test_user_profile_one_to_one_constraint(self):
        with self.assertRaises(IntegrityError):
            UserProfile.objects.create(user=self.user, role=UserProfile.ROLE_ADMIN)

# ---------------------------------------------------------------------------
# Authentication guard tests  (unauthenticated → 401)
# ---------------------------------------------------------------------------


class UnauthenticatedAccessTest(APITestCase):
    """Every protected endpoint must reject unauthenticated requests."""

    def _assert_401(self, url, method="get", data=None):
        request_func = getattr(self.client, method)
        if data is not None:
            response = request_func(url, data, format="json")
        else:
            response = request_func(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bonds_list_requires_auth(self):
        self._assert_401("/bonds/")

    def test_issuers_list_requires_auth(self):
        self._assert_401("/issuers/")

    def test_users_list_requires_auth(self):
        self._assert_401("/users/")

    def test_transactions_list_requires_auth(self):
        self._assert_401("/transactions/")

    def test_export_csv_requires_auth(self):
        self._assert_401("/bonds/export_csv/")

    def test_meta_requires_auth(self):
        self._assert_401("/api/meta/")

    # --- POST/PATCH/DELETE Bonds ---
    def test_create_bond_requires_auth(self):
        self._assert_401("/bonds/", method="post", data={"isin": "US0000000000"})

    def test_update_bond_requires_auth(self):
        self._assert_401("/bonds/1/", method="patch", data={"isin": "US1111111111"})

    def test_delete_bond_requires_auth(self):
        self._assert_401("/bonds/1/", method="delete")

    def test_bulk_delete_requires_auth(self):
        self._assert_401("/bonds/bulk_delete/", method="delete", data={"ids": [1, 2]})

    # --- POST/PATCH/DELETE Issuers ---
    def test_create_issuer_requires_auth(self):
        self._assert_401("/issuers/", method="post", data={"name": "erlan"})

    def test_update_issuer_requires_auth(self):
        self._assert_401("/issuers/1/", method="patch", data={"name": "aida"})

    def test_delete_issuer_requires_auth(self):
        self._assert_401("/issuers/1/", method="delete")

    # --- POST/PATCH/DELETE Users ---
    def test_create_user_requires_auth(self):
        self._assert_401(
            "/users/",
            method="post",
            data={"username": "erlan", "password": "12345667asfxcvwqqe"},
        )

    def test_update_user_requires_auth(self):
        self._assert_401(
            "/users/1/",
            method="patch",
            data={"username": "aida"},
        )

    def test_delete_user_requires_auth(self):
        self._assert_401("/users/1/", method="delete")

    # --- POST/PATCH/DELETE Transactions ---
    def test_create_transaction_requires_auth(self):
        self._assert_401(
            "/transactions/",
            method="post",
            data={
                "user": "1",
                "bond": "1",
                "action": "BUY",
                "quantity": "2",
                "price": "100",
            },
        )

    def test_update_transaction_requires_auth(self):
        self._assert_401(
            "/transactions/1/",
            method="patch",
            data={
                "user": "1",
                "bond": "1",
                "action": "sell",
                "quantity": "2",
                "price": "100",
            },
        )

    def test_delete_transaction_requires_auth(self):
        self._assert_401("/transactions/1/", method="delete")


# ---------------------------------------------------------------------------
# UserViewSet
# ---------------------------------------------------------------------------


class UserViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="erlan", password="erlan")
        self.client = auth_client(self.user)

    def test_list_users(self):
        response = self.client.get("/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_user(self):
        response = self.client.get("/users/1/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "erlan")

    def test_create_user(self):
        response = self.client.post(
            "/users/",
            {"username": "aida", "password": "aida123456", "email": "aida@gmail.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="aida").exists())

    def test_update_user(self):
        response = self.client.patch(
            f"/users/{self.user.pk}/", {"email": "erlan@gmail.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_user(self):
        response = self.client.delete(f"/users/{self.user.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())


class IssuerViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="erlan", password="erlan")
        self.client = auth_client(self.user)
        self.issuer = make_issuer()

    def test_list_issuers(self):
        response = self.client.get("/issuers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_issuer(self):
        response = self.client.get(f"/issuers/{self.issuer.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Issuer")

    def test_create_issuer(self):
        response = self.client.post(
            "/issuers/",
            {
                "name": "ACME Corp",
                "country": "US",
                "industry": "Technology",
                "credit_rating": "AAA",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.issuer.refresh_from_db()
        self.assertTrue(Issuer.objects.filter(name="ACME Corp").exists())

    def test_update_issuer(self):
        response = self.client.patch(
            f"/issuers/{self.issuer.pk}/", {"name": "EMCA Corp"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.issuer.refresh_from_db()
        self.assertTrue(Issuer.objects.filter(name="EMCA Corp").exists())

    def test_delete_issuer(self):
        response = self.client.delete(f"/issuers/{self.issuer.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Issuer.objects.filter(pk=self.issuer.pk).exists())


# ---------------------------------------------------------------------------
# BondViewSet — CRUD
# ---------------------------------------------------------------------------


class BondViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="erlan", password="erlan")
        self.client = auth_client(self.user)
        self.issuer = make_issuer()
        self.bond = make_bond(self.issuer)

    def test_list_bonds(self):
        response = self.client.get("/bonds/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_retrieve_bond(self):
        response = self.client.get(f"/bonds/{self.bond.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["isin"], "US1234567890")

    def test_create_bond(self):
        response = self.client.post(
            "/bonds/",
            {
                "isin": "US1122334455",
                "issuer": self.issuer.pk,
                "bond_type": "GOV",
                "face_value": "500.00",
                "coupon_rate": "3.50",
                "issue_date": "2021-06-01",
                "maturity_date": "2031-06-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_bond(self):
        response = self.client.patch(
            f"/bonds/{self.bond.pk}/", {"isin": "US1111111111"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bond.refresh_from_db()
        self.assertEqual(str(self.bond.isin), "US1111111111")

    def test_delete_bond(self):
        response = self.client.delete(f"/bonds/{self.bond.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Bond.objects.filter(pk=self.bond.pk).exists())


# ---------------------------------------------------------------------------
# BondView — filtering / search / ordering
# ---------------------------------------------------------------------------


class BondViewFilterTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="erlan", password="erlan")
        self.client = auth_client(self.user)

        self.issuer_tech = make_issuer(
            name="Tech Corp", country="US", credit_rating="AAA", industry="Technology"
        )
        self.issuer_energy = make_issuer(
            name="Energy LLC", country="UK", credit_rating="BBB", industry="Energy"
        )

        self.bond1 = make_bond(
            issuer=self.issuer_tech,
            isin="US1111111111",
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="3.00",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )
        self.bond2 = make_bond(
            issuer=self.issuer_tech,
            isin="US2222222222",
            bond_type="GOV",
            face_value="5000.00",
            coupon_rate="5.00",
            issue_date="2021-06-15",
            maturity_date="2031-06-15",
        )
        self.bond3 = make_bond(
            issuer=self.issuer_energy,
            isin="GB3333333333",
            bond_type="MUNI",
            face_value="10000.00",
            coupon_rate="7.00",
            issue_date="2022-12-31",
            maturity_date="2032-12-31",
        )

    # ==========================================
    # STRING & EXACT FILTERS
    # ==========================================

    def test_filter_by_isin_exact_and_icontains(self):
        # Exact
        res_exact = self.client.get("/bonds/", {"isin": "US1111111111"})
        self.assertEqual(res_exact.data["count"], 1)

        # iContains
        res_icontains = self.client.get("/bonds/", {"isin__icontains": "US"})
        self.assertEqual(res_icontains.data["count"], 2)

    def test_filter_by_bond_type(self):
        res = self.client.get("/bonds/", {"bond_type": "CORP"})
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["isin"], "US1111111111")

    # ==========================================
    # NUMERIC FILTERS (gte, lte, exact)
    # ==========================================

    def test_filter_face_value(self):
        res_exact = self.client.get("/bonds/", {"face_value": "1000.00"})
        self.assertEqual(res_exact.data["count"], 1)

        res_gte = self.client.get("/bonds/", {"face_value__gte": "5000"})
        self.assertEqual(res_gte.data["count"], 2)

    def test_filter_coupon_rate(self):
        res_lte = self.client.get("/bonds/", {"coupon_rate__lte": "6.00"})
        self.assertEqual(res_lte.data["count"], 2)

    # ==========================================
    # DATE FILTERS (gte, lte, exact)
    # ==========================================

    def test_filter_issue_date(self):
        # Anything issued after Jan 1, 2021 (catches bond2 and bond3)
        res_gte = self.client.get("/bonds/", {"issue_date__gte": "2021-01-01"})
        self.assertEqual(res_gte.data["count"], 2)

    def test_filter_maturity_date(self):
        # Exact
        res_exact = self.client.get("/bonds/", {"maturity_date": "2030-01-01"})
        self.assertEqual(res_exact.data["count"], 1)

    # ==========================================
    # RELATIONAL FILTERS (issuer__...)
    # ==========================================

    def test_filter_issuer_name(self):
        res = self.client.get("/bonds/", {"issuer__name__icontains": "Tech"})
        self.assertEqual(res.data["count"], 2)

    def test_filter_issuer_country(self):
        res = self.client.get("/bonds/", {"issuer__country": "UK"})
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["isin"], "GB3333333333")

    def test_filter_issuer_credit_rating(self):
        res = self.client.get("/bonds/", {"issuer__credit_rating": "AAA"})
        self.assertEqual(res.data["count"], 2)

    def test_filter_issuer_industry(self):
        res = self.client.get("/bonds/", {"issuer__industry__icontains": "Energy"})
        self.assertEqual(res.data["count"], 1)

    # ==========================================
    # SEARCH
    # ==========================================

    def test_search_by_isin(self):
        res = self.client.get("/bonds/", {"search": "GB333"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    # ==========================================
    # ORDERING
    # ==========================================

    def test_ordering_by_coupon_rate(self):
        # Ascending
        res_asc = self.client.get("/bonds/", {"ordering": "coupon_rate"})
        results = res_asc.data["results"]
        self.assertEqual(results[0]["coupon_rate"], "3.00")
        self.assertEqual(results[-1]["coupon_rate"], "7.00")

        # Descending
        res_desc = self.client.get("/bonds/", {"ordering": "-coupon_rate"})
        results = res_desc.data["results"]
        self.assertEqual(results[0]["coupon_rate"], "7.00")
        self.assertEqual(results[-1]["coupon_rate"], "3.00")

    def test_ordering_by_issue_date(self):
        res_desc = self.client.get("/bonds/", {"ordering": "-issue_date"})
        results = res_desc.data["results"]
        self.assertEqual(results[0]["isin"], "GB3333333333")  # Newest
        self.assertEqual(results[-1]["isin"], "US1111111111")  # Oldest

    def test_ordering_by_relational_field_issuer_name(self):
        # Ascending (Energy LLC should come before Tech Corp)
        res = self.client.get("/bonds/", {"ordering": "issuer__name"})
        results = res.data["results"]
        self.assertEqual(results[0]["issuer_name"], "Energy LLC")
        self.assertEqual(results[-1]["issuer_name"], "Tech Corp")


# ---------------------------------------------------------------------------
# BondViewSet — bulk_delete
# ---------------------------------------------------------------------------


class BondBulkDeleteTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="erlan", password="erlan")
        self.client = auth_client(self.user)
        self.issuer = make_issuer()
        self.bond1 = make_bond(self.issuer, isin="AA0000000001")
        self.bond2 = make_bond(self.issuer, isin="AA0000000002")
        self.bond3 = make_bond(self.issuer, isin="AA0000000003")

    def test_bulk_delete_selected_bonds(self):
        ids = [str(self.bond1.pk), str(self.bond2.pk)]
        response = self.client.delete(
            "/bonds/bulk_delete/", {"ids": ids}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Bond.objects.filter(pk__in=ids).exists())
        self.assertTrue(Bond.objects.filter(pk=self.bond3.pk).exists())

    def test_bulk_delete_empty_list_is_no_op(self):
        before = Bond.objects.count()
        response = self.client.delete("/bonds/bulk_delete/", {"ids": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Bond.objects.count(), before)

    def test_bulk_delete_missing_ids(self):
        before = Bond.objects.count()
        response = self.client.delete("/bonds/bulk_delete/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Bond.objects.count(), before)


# ---------------------------------------------------------------------------
# BondViewSet — export_csv
# ---------------------------------------------------------------------------


class BondExportCsvTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="erlan", password="erlan")
        self.client = auth_client(self.user)
        self.issuer = make_issuer()
        self.bond1 = make_bond(self.issuer, isin="AA0000000001")

    def test_export_csv_return_streaming_response(self):
        response = self.client.get("/bonds/export_csv/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("bonds_export.csv", response["Content-Disposition"])

    def text_export_csv_contains_header_row(self):
        response = self.client.get("/bonds/export_csv/")
        content = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn("ISIN", content)
        self.assertIn("Issuer", content)
        self.assertIn("Coupon", content)

    def text_export_csv_contains_data(self):
        response = self.client.get("/bonds/export_csv/")
        content = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn("AA0000000001", content)
        self.assertIn("Test Issuer", content)

    def text_export_csv_respects_filters(self):
        issuer2 = make_issuer(name="Other Corp")
        make_bond(issuer2, isin="DE0000000001", bond_type="GOV")

        response = self.client.get("/bonds/export_csv/", {"bond_type": "CORP"})
        content = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn("AA0000000001", content)
        self.assertNotIn("DE0000000001", content)

    def test_export_csv_empty_db(self):
        Bond.objects.all().delete()
        response = self.client.get("/bonds/export_csv/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        content = b"".join(response.streaming_content).decode("utf-8")
        lines = [l for l in content.splitlines() if l.strip()]
        self.assertEqual(len(lines), 1)


# ---------------------------------------------------------------------------
# BondViewSet — import_preview
# ---------------------------------------------------------------------------


class BondImportPreviewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass")
        self.client = auth_client(self.user)
        self.issuer = make_issuer(name="Existing Corp")
        self.existing_bond = make_bond(self.issuer, isin="US1234567890")
        self.url = "/bonds/import_preview/"

    def _upload(self, data: bytes, filename: str = "test.csv"):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile(filename, data, content_type="text/csv")
        return self.client.post(self.url, {"file": f}, format="multipart")

    def test_preview_returns_counts(self):
        csv_data = make_csv_bytes(
            [
                {"ISIN": "US1234567890", "Issuer": "Existing Corp"},  # existing
                {"ISIN": "DE0000000099", "Issuer": "New Corp"},  # new
            ]
        )
        response = self._upload(csv_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)
        self.assertEqual(response.data["existing"], 1)
        self.assertEqual(response.data["new"], 1)

    def test_preview_no_file_returns_error(self):
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("error", response.data)

    def test_preview_non_csv_returns_400(self):
        response = self.client.post(
            self.url,
            {"file": io.BytesIO(b"not a csv")},
            format="multipart",
        )
        # The uploaded "file" has no name attribute via BytesIO directly;
        # use a named wrapper instead.
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile("data.txt", b"hello", content_type="text/plain")
        response = self.client.post(self.url, {"file": f}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_preview_empty_csv_returns_400(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile("empty.csv", b"", content_type="text/csv")
        response = self.client.post(self.url, {"file": f}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_preview_skips_rows_without_isin(self):
        csv_data = make_csv_bytes(
            [
                {"ISIN": "", "Issuer": "Some Corp"},  # no ISIN → must be skipped
                {"ISIN": "DE9999999999", "Issuer": "Real Corp"},
            ]
        )
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile("data.csv", csv_data, content_type="text/csv")
        response = self.client.post(self.url, {"file": f}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)


# ---------------------------------------------------------------------------
# BondViewSet — import_csv
# ---------------------------------------------------------------------------

# Minimal valid CSV rows
_VALID_ROWS = [
    {
        "ISIN": "XS0000000001",
        "Issuer": "Import Issuer",
        "Country": "GB",
        "Industry": "Energy",
        "Rating": "Prime (AAA)",
        "Type": "Corporate",
        "Face Value": "1000",
        "Coupon": "4.5",
        "Issue Date": "01/01/2022",
        "Maturity Date": "01/01/2032",
    }
]

_FIELDNAMES = [
    "ISIN",
    "Issuer",
    "Country",
    "Industry",
    "Rating",
    "Type",
    "Face Value",
    "Coupon",
    "Issue Date",
    "Maturity Date",
]


class BondImportCsvTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass")
        self.client = auth_client(self.user)
        self.url = "/bonds/import_csv/"

    def _upload_csv(self, rows, fieldnames=None, filename="upload.csv"):
        from django.core.files.uploadedfile import SimpleUploadedFile

        data = make_csv_bytes(rows, fieldnames or _FIELDNAMES)
        f = SimpleUploadedFile(filename, data, content_type="text/csv")
        return self.client.post(self.url, {"file": f}, format="multipart")

    # -- happy path ----------------------------------------------------------

    def test_import_creates_bond_and_issuer(self):
        response = self._upload_csv(_VALID_ROWS)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Bond.objects.filter(isin="XS0000000001").exists())
        self.assertTrue(Issuer.objects.filter(name="Import Issuer").exists())

    def test_import_upserts_existing_bond(self):
        """Importing the same ISIN twice must not raise — it's an upsert."""
        self._upload_csv(_VALID_ROWS)
        updated = [{**_VALID_ROWS[0], "Coupon": "6.0"}]
        response = self._upload_csv(updated)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        bond = Bond.objects.get(isin="XS0000000001")
        self.assertEqual(str(bond.coupon_rate), "6.00")
        self.assertEqual(response.data["created_count"], 0)
        self.assertEqual(response.data["updated_count"], 1)
        self.assertEqual(response.data["skipped_count"], 0)

    def test_import_partially_updates_existing_bond_only_provided_fields(self):
        issuer = make_issuer(name="Original Issuer", country="DE")
        bond = make_bond(
            issuer=issuer,
            isin="XS1111111111",
            bond_type="CORP",
            face_value="1000.00",
            coupon_rate="5.00",
            issue_date="2020-01-01",
            maturity_date="2030-01-01",
        )

        # Existing bond update: only coupon and issuer should change.
        rows = [
            {
                "ISIN": "XS1111111111",
                "Issuer": "New Issuer",
                "Country": "FR",
                "Coupon": "7.25",
            }
        ]
        fieldnames = ["ISIN", "Issuer", "Country", "Coupon"]

        response = self._upload_csv(rows, fieldnames=fieldnames)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_count"], 0)
        self.assertEqual(response.data["updated_count"], 1)
        self.assertEqual(response.data["skipped_count"], 0)

        bond.refresh_from_db()
        self.assertEqual(bond.issuer.name, "New Issuer")
        self.assertEqual(str(bond.coupon_rate), "7.25")
        # Not provided in CSV row, so the original values should stay.
        self.assertEqual(str(bond.face_value), "1000.00")
        self.assertEqual(str(bond.issue_date), "2020-01-01")
        self.assertEqual(str(bond.maturity_date), "2030-01-01")

    def test_import_skips_new_bond_when_required_fields_missing(self):
        rows = [
            {
                "ISIN": "XS2222222222",
                "Issuer": "Missing Fields Issuer",
                "Country": "HU",
                "Issue Date": "01/01/2022",
                "Maturity Date": "01/01/2032",
                # Missing Face Value and Coupon for new bond.
            }
        ]
        fieldnames = ["ISIN", "Issuer", "Country", "Issue Date", "Maturity Date"]
        response = self._upload_csv(rows, fieldnames=fieldnames)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_count"], 0)
        self.assertEqual(response.data["updated_count"], 0)
        self.assertEqual(response.data["skipped_count"], 1)
        self.assertEqual(response.data["total_rows"], 1)
        self.assertIn(
            "Missing required fields for new bond",
            response.data["skipped"][0]["errors"],
        )
        self.assertFalse(Bond.objects.filter(isin="XS2222222222").exists())

    def test_import_reuses_existing_issuer(self):
        existing_issuer = Issuer.objects.create(
            name="Import Issuer", country="GB", industry="Energy", credit_rating="AAA"
        )
        self._upload_csv(_VALID_ROWS)
        # Should NOT have created a duplicate
        self.assertEqual(Issuer.objects.filter(name="Import Issuer").count(), 1)

    def test_import_maps_industry_correctly(self):
        rows = [{**_VALID_ROWS[0], "Industry": "Telecom", "ISIN": "XS0000000002"}]
        self._upload_csv(rows)
        issuer = Issuer.objects.get(name="Import Issuer")
        # Telecom → "Communication Services" per INDUSTRY_MAP
        self.assertEqual(issuer.industry, "Communication Services")

    def test_import_maps_rating_correctly(self):
        rows = [
            {
                **_VALID_ROWS[0],
                "Rating": "Highly Speculative (B)",
                "ISIN": "XS0000000003",
            }
        ]
        self._upload_csv(rows)
        issuer = Issuer.objects.get(name="Import Issuer")
        self.assertEqual(issuer.credit_rating, "C")

    def test_import_maps_bond_type_correctly(self):
        rows = [{**_VALID_ROWS[0], "Type": "Government", "ISIN": "XS0000000004"}]
        self._upload_csv(rows)
        bond = Bond.objects.get(isin="XS0000000004")
        self.assertEqual(bond.bond_type, "GOV")

    def test_import_skips_row_without_isin(self):
        rows = [
            {**_VALID_ROWS[0], "ISIN": ""},  # skip
            {**_VALID_ROWS[0], "ISIN": "XS0000099999"},
        ]
        response = self._upload_csv(rows)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Bond.objects.filter(isin="XS0000099999").exists())
        self.assertFalse(Bond.objects.filter(isin="").exists())

    def test_import_skips_row_without_issuer(self):
        rows = [
            {**_VALID_ROWS[0], "Issuer": ""},  # skip
            {**_VALID_ROWS[0], "ISIN": "XS0000088888"},
        ]
        response = self._upload_csv(rows)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bond.objects.filter(isin="XS0000088888").count(), 1)

    def test_import_skips_row_with_invalid_date(self):
        rows = [
            {**_VALID_ROWS[0], "Issue Date": "NOT-A-DATE", "ISIN": "XS9999999999"},
            {**_VALID_ROWS[0], "ISIN": "XS0000077777"},
        ]
        response = self._upload_csv(rows)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Bond.objects.filter(isin="XS9999999999").exists())
        self.assertTrue(Bond.objects.filter(isin="XS0000077777").exists())

    def test_import_accepts_multiple_date_formats(self):
        formats = [
            ("01/01/2022", "XS0000000010"),  # MM/DD/YYYY
            ("2022-01-01", "XS0000000011"),  # YYYY-MM-DD
            ("01/01/22", "XS0000000012"),  # MM/DD/YY
        ]
        rows = [
            {**_VALID_ROWS[0], "Issue Date": date_str, "ISIN": isin}
            for date_str, isin in formats
        ]
        response = self._upload_csv(rows)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        for _, isin in formats:
            self.assertTrue(Bond.objects.filter(isin=isin).exists(), f"Missing {isin}")

    def test_import_defaults_for_missing_optional_fields(self):
        """Industry / Rating / Country / Bond Type  → defaults from INDUSTRY_MAP / RATING_MAP / country: "Other"" / BOND_TYPE_MAP."""
        rows = [
            {
                "ISIN": "KG0378331022",
                "Issuer": "Default Issuer",
                "Issue Date": "01/01/2022",
                "Maturity Date": "01/01/2032",
                "Face Value": "1000.00",
                "Coupon": "5.00",
            }
        ]
        fieldnames = [
            "ISIN",
            "Issuer",
            "Issue Date",
            "Maturity Date",
            "Face Value",
            "Coupon",
        ]
        response = self._upload_csv(rows, fieldnames=fieldnames)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        bond = Bond.objects.get(isin="KG0378331022")
        self.assertEqual(bond.bond_type, "CORP")  # default

    # -- error paths ---------------------------------------------------------

    def test_import_no_file_returns_error(self):
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("error", response.data)

    def test_import_non_csv_extension_returns_400(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile(
            "data.xlsx", b"binary", content_type="application/octet-stream"
        )
        response = self.client.post(self.url, {"file": f}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_import_empty_csv_returns_400(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile("empty.csv", b"", content_type="text/csv")
        response = self.client.post(self.url, {"file": f}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)


# ---------------------------------------------------------------------------
# TransactionViewSet
# ---------------------------------------------------------------------------


class TransactionViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass")
        self.client = auth_client(self.user)
        self.issuer = make_issuer()
        self.bond = make_bond(self.issuer)
        self.transaction = Transaction.objects.create(
            user=self.user,
            bond=self.bond,
            action="BUY",
            quantity=10,
            price="980.00",
        )

    def test_list_transactions(self):
        response = self.client.get("/transactions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_transaction(self):
        response = self.client.get(f"/transactions/{self.transaction.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["action"], "BUY")

    def test_create_transaction(self):
        response = self.client.post(
            "/transactions/",
            {
                "user": self.user.pk,
                "bond": self.bond.pk,
                "action": "SELL",
                "quantity": 5,
                "price": "1010.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_transaction(self):
        response = self.client.patch(
            f"/transactions/{self.transaction.pk}/",
            {"quantity": 20},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.transaction.refresh_from_db()
        self.assertEqual(self.transaction.quantity, 20)

    def test_delete_transaction(self):
        response = self.client.delete(f"/transactions/{self.transaction.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transaction.objects.filter(pk=self.transaction.pk).exists())


# ---------------------------------------------------------------------------
# meta view
# ---------------------------------------------------------------------------


class MetaViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass")
        self.client = auth_client(self.user)

    def test_meta_returns_200(self):
        response = self.client.get("/api/meta/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_meta_contains_credit_ratings(self):
        response = self.client.get("/api/meta/")
        self.assertIn("credit_ratings", response.data)
        self.assertIsInstance(response.data["credit_ratings"], list)
        # Each item must have id & name keys
        for item in response.data["credit_ratings"]:
            self.assertIn("id", item)
            self.assertIn("name", item)

    def test_meta_contains_industries(self):
        response = self.client.get("/api/meta/")
        self.assertIn("industries", response.data)
        self.assertGreater(len(response.data["industries"]), 0)

    def test_meta_contains_bond_types(self):
        response = self.client.get("/api/meta/")
        self.assertIn("bond_types", response.data)
        type_ids = [t["id"] for t in response.data["bond_types"]]
        self.assertIn("GOV", type_ids)
        self.assertIn("CORP", type_ids)
        self.assertIn("MUNI", type_ids)

    def test_meta_unauthenticated_returns_401(self):
        self.client.credentials()  # clear auth
        response = self.client.get("/api/meta/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RBACPermissionsTest(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(username="admin", password="pass")
        self.editor_user = User.objects.create_user(username="editor", password="pass")
        self.viewer_user = User.objects.create_user(username="viewer", password="pass")

        self.admin_client = auth_client(self.admin_user, UserProfile.ROLE_ADMIN)
        self.editor_client = auth_client(self.editor_user, UserProfile.ROLE_EDITOR)
        self.viewer_client = auth_client(self.viewer_user, UserProfile.ROLE_VIEWER)

        self.issuer = make_issuer(name="RBAC Issuer")
        self.bond = make_bond(self.issuer, isin="US9999999999")
        self.admin_tx = Transaction.objects.create(
            user=self.admin_user,
            bond=self.bond,
            action="BUY",
            quantity=1,
            price="100.00",
        )
        self.editor_tx = Transaction.objects.create(
            user=self.editor_user,
            bond=self.bond,
            action="BUY",
            quantity=2,
            price="101.00",
        )

    def test_users_endpoint_admin_only(self):
        self.assertEqual(
            self.admin_client.get("/users/").status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.editor_client.get("/users/").status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertEqual(
            self.viewer_client.get("/users/").status_code, status.HTTP_403_FORBIDDEN
        )

    def test_issuer_create_allows_editor_denies_viewer(self):
        payload = {
            "name": "Role Corp",
            "country": "US",
            "industry": "Technology",
            "credit_rating": "AA",
        }
        self.assertEqual(
            self.editor_client.post("/issuers/", payload, format="json").status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            self.viewer_client.post("/issuers/", payload, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_bond_delete_admin_only(self):
        editor_response = self.editor_client.delete(f"/bonds/{self.bond.pk}/")
        self.assertEqual(editor_response.status_code, status.HTTP_403_FORBIDDEN)
        admin_response = self.admin_client.delete(f"/bonds/{self.bond.pk}/")
        self.assertEqual(admin_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_bulk_delete_admin_only(self):
        bond2 = make_bond(self.issuer, isin="US8888888888")
        editor_response = self.editor_client.delete(
            "/bonds/bulk_delete/", {"ids": [bond2.pk]}, format="json"
        )
        self.assertEqual(editor_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_import_preview_denied_for_viewer(self):
        response = self.viewer_client.post(
            "/bonds/import_preview/", {}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_transactions_list_respects_ownership_for_non_admin(self):
        admin_response = self.admin_client.get("/transactions/")
        editor_response = self.editor_client.get("/transactions/")
        viewer_response = self.viewer_client.get("/transactions/")

        self.assertEqual(len(admin_response.data), 2)
        self.assertEqual(len(editor_response.data), 1)
        self.assertEqual(editor_response.data[0]["id"], self.editor_tx.id)
        self.assertEqual(len(viewer_response.data), 0)

    def test_editor_cannot_modify_other_users_transaction(self):
        response = self.editor_client.patch(
            f"/transactions/{self.admin_tx.pk}/", {"quantity": 22}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_create_transaction(self):
        response = self.viewer_client.post(
            "/transactions/",
            {"bond": self.bond.pk, "action": "BUY", "quantity": 3, "price": "102.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_users_me_returns_role(self):
        response = self.editor_client.get("/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], UserProfile.ROLE_EDITOR)
