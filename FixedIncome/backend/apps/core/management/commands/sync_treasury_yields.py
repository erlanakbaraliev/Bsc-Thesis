from django.core.management.base import BaseCommand

from apps.core.alphavantage_treasury import (
    AlphaVantageTreasuryError,
    sync_treasury_yields,
)
from apps.core.models import TreasuryYieldObservation


class Command(BaseCommand):
    help = (
        "Fetch US Treasury yields (2Y, 10Y, 30Y) from Alpha Vantage and store them."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            default=TreasuryYieldObservation.INTERVAL_MONTHLY,
            help="Alpha Vantage interval (default: monthly).",
        )

    def handle(self, *args, **options):
        interval = options["interval"]
        try:
            summary = sync_treasury_yields(interval=interval)
        except AlphaVantageTreasuryError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            raise SystemExit(1) from e
        self.stdout.write(
            self.style.SUCCESS(
                f"Synced {summary['total_upserted']} rows "
                f"(interval={interval}). Latest dates: {summary['latest_observation_dates']}"
            )
        )
