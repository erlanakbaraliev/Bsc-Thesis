from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Bond, Issuer, Transaction


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["url", "username", "email", "groups"]


class IssuerSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Issuer
        fields = "__all__"


class BondSerializer(serializers.HyperlinkedModelSerializer):
    issuer_name = serializers.CharField(source="issuer.name", read_only=True)
    credit_rating = serializers.CharField(source="issuer.credit_rating", read_only=True)

    class Meta:
        model = Bond
        fields = [
            "id",
            "isin",
            "issuer",
            "issuer_name",
            "credit_rating",
            "bond_type",
            "bond_type",
            "face_value",
            "coupon_rate",
            "issue_date",
            "maturity_date",
        ]


class TransactionSerializer(serializers.HyperlinkedModelSerializer):
    bond_isin = serializers.CharField(source="bond.isin", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "user",
            "username",
            "bond",
            "bond_isin",
            "action",
            "quantity",
            "price",
            "transaction_date",
        ]
