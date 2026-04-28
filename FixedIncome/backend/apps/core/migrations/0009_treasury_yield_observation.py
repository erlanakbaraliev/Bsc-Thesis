# Generated manually for TreasuryYieldObservation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_alter_bond_coupon_rate_alter_bond_face_value_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="TreasuryYieldObservation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("observation_date", models.DateField(db_index=True)),
                (
                    "maturity",
                    models.CharField(
                        choices=[
                            ("2year", "2-Year"),
                            ("10year", "10-Year"),
                            ("30year", "30-Year"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "interval",
                    models.CharField(
                        choices=[("monthly", "Monthly")],
                        default="monthly",
                        max_length=16,
                    ),
                ),
                (
                    "yield_pct",
                    models.DecimalField(
                        decimal_places=4,
                        help_text="Yield in percent (e.g. 4.25 for 4.25%).",
                        max_digits=8,
                    ),
                ),
                ("fetched_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddConstraint(
            model_name="treasuryyieldobservation",
            constraint=models.UniqueConstraint(
                fields=("observation_date", "maturity", "interval"),
                name="uniq_treasury_yield_obs_date_maturity_interval",
            ),
        ),
    ]
