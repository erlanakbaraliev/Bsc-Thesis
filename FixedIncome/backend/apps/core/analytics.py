from datetime import date
from decimal import Decimal

from django.db.models import Avg, Count

from apps.core.models import Bond


def _normalize_label(value, fallback="Unknown"):
    if value is None:
        return fallback
    cleaned = str(value).strip()
    return cleaned if cleaned else fallback


def _group_counts(queryset, field_name, fallback="Unknown"):
    grouped = queryset.values(field_name).annotate(value=Count("id")).order_by("-value")
    return [
        {"label": _normalize_label(item[field_name], fallback), "value": item["value"]}
        for item in grouped
    ]


def _maturity_bucket_label(maturity_date, today):
    years_to_maturity = (maturity_date - today).days / 365.25
    if years_to_maturity < 0:
        return "Matured"
    if years_to_maturity < 1:
        return "<1 year"
    if years_to_maturity <= 3:
        return "1-3 years"
    if years_to_maturity <= 5:
        return "3-5 years"
    if years_to_maturity <= 10:
        return "5-10 years"
    return "10+ years"


def build_bond_analytics():
    queryset = Bond.objects.select_related("issuer").all()
    today = date.today()

    by_bond_type = _group_counts(queryset, "bond_type", fallback="Unknown")
    by_credit_rating = _group_counts(queryset, "issuer__credit_rating", fallback="Unrated")
    by_industry = _group_counts(queryset, "issuer__industry", fallback="Other")

    maturity_counts = {
        "Matured": 0,
        "<1 year": 0,
        "1-3 years": 0,
        "3-5 years": 0,
        "5-10 years": 0,
        "10+ years": 0,
    }
    for maturity_date in queryset.values_list("maturity_date", flat=True):
        bucket = _maturity_bucket_label(maturity_date, today)
        maturity_counts[bucket] += 1
    maturity_timeline = [{"label": label, "value": value} for label, value in maturity_counts.items()]

    summary_raw = queryset.aggregate(
        total_bonds=Count("id"),
        average_coupon_rate=Avg("coupon_rate"),
        average_face_value=Avg("face_value"),
    )
    average_coupon_rate = summary_raw["average_coupon_rate"] or Decimal("0.00")
    average_face_value = summary_raw["average_face_value"] or Decimal("0.00")

    return {
        "summary": {
            "totalBonds": summary_raw["total_bonds"] or 0,
            "averageCouponRate": round(float(average_coupon_rate), 2),
            "averageFaceValue": round(float(average_face_value), 2),
        },
        "byBondType": by_bond_type,
        "byCreditRating": by_credit_rating,
        "byIndustry": by_industry,
        "maturityTimeline": maturity_timeline,
    }
