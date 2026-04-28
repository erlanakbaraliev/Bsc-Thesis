"""Fetch US Treasury yields from Alpha Vantage TREASURY_YIELD and sync to DB."""

from __future__ import annotations

import logging
import time
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.models import TreasuryYieldObservation

logger = logging.getLogger(__name__)

ALPHA_URL = "https://www.alphavantage.co/query"
REQUEST_TIMEOUT_SEC = 30

DEFAULT_MATURITIES = (
    TreasuryYieldObservation.MATURITY_2Y,
    TreasuryYieldObservation.MATURITY_10Y,
    TreasuryYieldObservation.MATURITY_30Y,
)


class AlphaVantageTreasuryError(Exception):
    """Alpha Vantage returned an error, rate limit, or unexpected payload."""


def _raise_if_api_message(payload: dict[str, Any]) -> None:
    if "Error Message" in payload:
        raise AlphaVantageTreasuryError(payload["Error Message"])
    if "Note" in payload:
        raise AlphaVantageTreasuryError(payload["Note"])
    if "Information" in payload:
        raise AlphaVantageTreasuryError(payload["Information"])


def fetch_treasury_series(
    api_key: str,
    maturity: str,
    interval: str,
) -> list[tuple]:
    """
    Call Alpha Vantage and return list of (observation_date, yield_pct Decimal).
    """
    params = {
        "function": "TREASURY_YIELD",
        "interval": interval,
        "maturity": maturity,
        "apikey": api_key,
    }
    url = f"{ALPHA_URL}?{urlencode(params)}"
    response = requests.get(url, timeout=REQUEST_TIMEOUT_SEC)
    response.raise_for_status()
    payload = response.json()
    _raise_if_api_message(payload)
    raw_data = payload.get("data")
    if not isinstance(raw_data, list):
        raise AlphaVantageTreasuryError(
            "Unexpected response: missing or invalid 'data' array."
        )
    rows: list[tuple] = []
    for item in raw_data:
        if not isinstance(item, dict):
            continue
        date_str = item.get("date")
        val_str = item.get("value")
        if date_str is None or val_str is None:
            continue
        try:
            d = date.fromisoformat(str(date_str)[:10])
            y = Decimal(str(val_str).strip())
        except (ValueError, InvalidOperation):
            continue
        rows.append((d, y))
    return rows


def sync_treasury_yields(
    interval: str = TreasuryYieldObservation.INTERVAL_MONTHLY,
    api_key: str | None = None,
    maturities: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    """
    Fetch all configured maturities from Alpha Vantage and upsert observations.

    Returns a summary dict suitable for API responses and logging.
    """
    key = api_key if api_key is not None else getattr(
        settings, "ALPHAVANTAGE_API_KEY", ""
    )
    if not key:
        raise AlphaVantageTreasuryError(
            "ALPHAVANTAGE_API_KEY is not configured on the server."
        )
    mats = maturities if maturities is not None else DEFAULT_MATURITIES
    delay_sec = float(
        getattr(settings, "ALPHAVANTAGE_REQUEST_DELAY_SEC", 1.1) or 1.1
    )
    total_upserted = 0
    per_maturity: dict[str, int] = {}
    latest_dates: dict[str, str | None] = {}

    # Fetch outside DB transaction; pace requests (free tier ~1 req/s).
    batches: list[tuple[str, list]] = []
    for idx, maturity in enumerate(mats):
        if idx > 0:
            time.sleep(delay_sec)
        rows = fetch_treasury_series(key, maturity, interval)
        batches.append((maturity, rows))

    with transaction.atomic():
        for maturity, rows in batches:
            count = 0
            latest = None
            for observation_date, yield_pct in rows:
                TreasuryYieldObservation.objects.update_or_create(
                    observation_date=observation_date,
                    maturity=maturity,
                    interval=interval,
                    defaults={"yield_pct": yield_pct},
                )
                count += 1
                if latest is None or observation_date > latest:
                    latest = observation_date
            per_maturity[maturity] = count
            total_upserted += count
            latest_dates[maturity] = latest.isoformat() if latest else None

    now = timezone.now()
    logger.info(
        "Treasury yields synced",
        extra={
            "interval": interval,
            "total_upserted": total_upserted,
            "per_maturity": per_maturity,
        },
    )
    return {
        "interval": interval,
        "total_upserted": total_upserted,
        "per_maturity": per_maturity,
        "latest_observation_dates": latest_dates,
        "synced_at": now.isoformat(),
    }
