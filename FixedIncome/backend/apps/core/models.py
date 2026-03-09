from enum import unique
from django.db import models
from django.contrib.auth.models import User

class Issuer(models.Model):
    # The company or government issueing the bond
    RATING_CHOICES = [
        ("AAA", "Prime (AAA)"),
        ("AA", "Hight Grade (AAA)"),
        ("A", "Upper Medium (A)"),
        ("BBB", "Lower Medium Grade (BBB)"),
        ("BB", "Non-Investment Grade (BB)"),
        ("C", "Highly Speculative (C)"),
    ]

    name = models.CharField(max_length=255, unique=True)
    country = models.CharField(max_length=100)
    industry = models.CharField(max_length=100)
    credit_rating = models.CharField(max_length=3, choices=RATING_CHOICES, default="BBB")

    def __str__(self):
        return self.name

class Bond(models.Model):
    TYPE_CHOICES = [
        ('GOV', 'Government'),
        ('CORP', 'Corporate'),
        ('MUNI', 'Municipal'),
    ]

    # ISIN is international ID for bonds (always 12 chars)
    isin = models.CharField(max_length=12, unique=True, verbose_name='ISIN')
    issuer = models.ForeignKey(Issuer, on_delete=models.CASCADE, related_name='bonds')
    bond_type = models.CharField(max_length=4, choices=TYPE_CHOICES)

    # Financial Data
    face_value = models.DecimalField(max_digits=15, decimal_places=2, help_text="Principal amount")
    coupon_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage yield (e.g., 5.25)")

    # Dates
    issue_date = models.DateField()
    maturity_date = models.DateField()

    def __str__(self):
        return f"{self.isin} - {self.issuer.name} ({self.coupon_rate})"

class Transaction(models.Model):
    ACTION_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bond = models.ForeignKey(Bond, on_delete=models.CASCADE)
    action = models.CharField(max_length=4, choices=ACTION_CHOICES)

    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=15, decimal_places=2, help_text="Price per bond at transaction")
    transaction_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} {self.quantity} of {self.bond.isin}"
