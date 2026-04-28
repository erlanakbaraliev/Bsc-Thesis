"""Aggregate stored Treasury yields for the dashboard API."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from apps.core.models import TreasuryYieldObservation

TENOR_YEARS = {
    TreasuryYieldObservation.MATURITY_2Y: 2,
    TreasuryYieldObservation.MATURITY_10Y: 10,
    TreasuryYieldObservation.MATURITY_30Y: 30,
}


def build_treasury_dashboard(interval: str) -> dict:
    """
    Build JSON-serializable dashboard payload from DB (no external calls).
    """
    qs = TreasuryYieldObservation.objects.filter(interval=interval).order_by(
        "observation_date"
    )
    series: dict[str, list[dict]] = {
        TreasuryYieldObservation.MATURITY_2Y: [],
        TreasuryYieldObservation.MATURITY_10Y: [],
        TreasuryYieldObservation.MATURITY_30Y: [],
    }
    by_date: dict = defaultdict(dict)

    for row in qs:
        d_str = row.observation_date.isoformat()
        y = row.yield_pct
        entry = {"date": d_str, "yield": str(y)}
        if row.maturity in series:
            series[row.maturity].append(entry)
        by_date[row.observation_date][row.maturity] = y

    yield_curve: dict = {"as_of": None, "points": [], "message": None}
    spread_series: list[dict] = []

    dates_sorted = sorted(by_date.keys(), reverse=True)
    as_of = None
    for d in dates_sorted:
        m = by_date[d]
        if all(
            k in m
            for k in (
                TreasuryYieldObservation.MATURITY_2Y,
                TreasuryYieldObservation.MATURITY_10Y,
                TreasuryYieldObservation.MATURITY_30Y,
            )
        ):
            as_of = d
            break

    if as_of:
        m = by_date[as_of]
        yield_curve["as_of"] = as_of.isoformat()
        for mat in (
            TreasuryYieldObservation.MATURITY_2Y,
            TreasuryYieldObservation.MATURITY_10Y,
            TreasuryYieldObservation.MATURITY_30Y,
        ):
            yield_curve["points"].append(
                {
                    "tenorYears": TENOR_YEARS[mat],
                    "maturity": mat,
                    "yield": str(m[mat]),
                }
            )
    else:
        yield_curve["message"] = (
            "No single date has 2Y, 10Y, and 30Y observations yet. "
            "Run a sync after data is available."
        )

    # 10Y - 2Y spread on aligned dates
    dates_fwd = sorted(by_date.keys())
    for d in dates_fwd:
        m = by_date[d]
        y2 = m.get(TreasuryYieldObservation.MATURITY_2Y)
        y10 = m.get(TreasuryYieldObservation.MATURITY_10Y)
        if y2 is None or y10 is None:
            continue
        spread_pct: Decimal = y10 - y2
        spread_bp: Decimal = spread_pct * Decimal("100")
        spread_series.append(
            {
                "date": d.isoformat(),
                "spread_pct": str(spread_pct),
                "spread_bp": str(spread_bp),
            }
        )

    last_fetch = (
        qs.order_by("-fetched_at").values_list("fetched_at", flat=True).first()
    )

    return {
        "interval": interval,
        "series": series,
        "yield_curve": yield_curve,
        "spread": spread_series,
        "meta": {
            "last_fetched_at": last_fetch.isoformat() if last_fetch else None,
        },
    }
