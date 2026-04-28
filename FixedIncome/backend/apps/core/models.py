from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import (
    MaxValueValidator,
    MinLengthValidator,
    MinValueValidator,
    RegexValidator,
)
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Issuer(TimeStampedModel):
    # The company or government issueing the bond
    RATING_CHOICES = [
        ("AAA", "Prime (AAA)"),
        ("AA", "Hight Grade (AA)"),
        ("A", "Upper Medium (A)"),
        ("BBB", "Lower Medium Grade (BBB)"),
        ("BB", "Non-Investment Grade (BB)"),
        ("C", "Highly Speculative (C)"),
    ]

    INDUSTRY_CHOICES = [
        ("Energy", "Energy"),
        ("Materials", "Materials"),
        ("Industrial", "Industrials"),
        ("Financials", "Financials"),
        ("Technology", "Technology"),
        ("Healthcare", "Healthcare"),
        ("Utilities", "Utilities"),
        ("Government", "Government"),
        ("Real Estate", "Real Estate"),
        ("Consumer Discretionary", "Consumer Discretionary"),
        ("Consumer Staples", "Consumer Staples"),
        ("Communication Services", "Communication Services"),
        ("Other", "Other"),
    ]

    name = models.CharField(
        max_length=255, unique=True, validators=[MinLengthValidator(2)]
    )
    country = models.CharField(max_length=100)
    industry = models.CharField(max_length=100, choices=INDUSTRY_CHOICES)
    credit_rating = models.CharField(
        max_length=3, choices=RATING_CHOICES, default="BBB"
    )

    def __str__(self):
        return self.name


class Bond(TimeStampedModel):
    TYPE_CHOICES = [
        ("GOV", "Government"),
        ("CORP", "Corporate"),
        ("MUNI", "Municipal"),
    ]

    # ISIN is international ID for bonds (always 12 chars)
    isin = models.CharField(
        max_length=12,
        unique=True,
        verbose_name="ISIN",
        validators=[
            RegexValidator(
                regex=r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$",
                message="Invalid ISIN format (e.g. US0378331005)",
            )
        ],
    )
    issuer = models.ForeignKey(Issuer, on_delete=models.CASCADE, related_name="bonds")
    bond_type = models.CharField(max_length=4, choices=TYPE_CHOICES)

    # Financial Data
    face_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Principal amount",
        validators=[MinValueValidator(Decimal("0.01"))],
    )  # 1k usd you pay - 1k they pay back on maturity date
    coupon_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Percentage yield (e.g., 5.25)",
        validators=[
            MinValueValidator(Decimal("0.00")),  # Matches Yup min(0)
            MaxValueValidator(Decimal("100.00")),  # Matches Yup max(100)
        ],
    )  # interest they'll pay you on a montly or yearly basis

    # Dates
    issue_date = models.DateField()
    maturity_date = models.DateField()

    def clean(self):
        # Cross-field validation for dates
        super().clean()
        if self.issue_date and self.maturity_date:
            if self.maturity_date <= self.issue_date:
                raise ValidationError(
                    {"maturity_date": "Maturity date must be after issue date."}
                )

    def __str__(self):
        return f"{self.isin} - {self.issuer.name} ({self.coupon_rate})"


class Transaction(models.Model):
    ACTION_CHOICES = [
        ("BUY", "Buy"),
        ("SELL", "Sell"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bond = models.ForeignKey(Bond, on_delete=models.CASCADE)
    action = models.CharField(max_length=4, choices=ACTION_CHOICES)

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Price per bond at transaction",
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} {self.quantity} of {self.bond.isin}"


class TreasuryYieldObservation(models.Model):
    """Stored US Treasury constant maturity yields from Alpha Vantage TREASURY_YIELD."""

    MATURITY_2Y = "2year"
    MATURITY_10Y = "10year"
    MATURITY_30Y = "30year"
    MATURITY_CHOICES = [
        (MATURITY_2Y, "2-Year"),
        (MATURITY_10Y, "10-Year"),
        (MATURITY_30Y, "30-Year"),
    ]

    INTERVAL_MONTHLY = "monthly"
    INTERVAL_CHOICES = [
        (INTERVAL_MONTHLY, "Monthly"),
    ]

    observation_date = models.DateField(db_index=True)
    maturity = models.CharField(max_length=10, choices=MATURITY_CHOICES)
    interval = models.CharField(
        max_length=16, choices=INTERVAL_CHOICES, default=INTERVAL_MONTHLY
    )
    yield_pct = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        help_text="Yield in percent (e.g. 4.25 for 4.25%).",
    )
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["observation_date", "maturity", "interval"],
                name="uniq_treasury_yield_obs_date_maturity_interval",
            )
        ]

    def __str__(self):
        return f"{self.maturity} @ {self.observation_date}: {self.yield_pct}%"


class UserProfile(models.Model):
    ROLE_ADMIN = "ADMIN"
    ROLE_EDITOR = "EDITOR"
    ROLE_VIEWER = "VIEWER"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_EDITOR, "Editor"),
        (ROLE_VIEWER, "Viewer"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_VIEWER)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, "profile"):
        instance.profile.save()
