from django.contrib.auth.models import User
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

    name = models.CharField(max_length=255, unique=True)
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
    isin = models.CharField(max_length=12, unique=True, verbose_name="ISIN")
    issuer = models.ForeignKey(Issuer, on_delete=models.CASCADE, related_name="bonds")
    bond_type = models.CharField(max_length=4, choices=TYPE_CHOICES)

    # Financial Data
    face_value = models.DecimalField(
        max_digits=15, decimal_places=2, help_text="Principal amount"
    )  # 1k usd you pay - 1k they pay back on maturity date
    coupon_rate = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Percentage yield (e.g., 5.25)"
    )  # interest they'll pay you on a montly or yearly basis

    # Dates
    issue_date = models.DateField()
    maturity_date = models.DateField()

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

    quantity = models.PositiveIntegerField()
    price = models.DecimalField(
        max_digits=15, decimal_places=2, help_text="Price per bond at transaction"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} {self.quantity} of {self.bond.isin}"


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
