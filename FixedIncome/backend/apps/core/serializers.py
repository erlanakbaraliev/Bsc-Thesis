from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Bond, Issuer, Transaction


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", required=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "groups", "role"]

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        user = super().create(validated_data)
        role = profile_data.get("role")
        if role:
            user.profile.role = role
            user.profile.save(update_fields=["role"])
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        user = super().update(instance, validated_data)
        role = profile_data.get("role")
        if role:
            user.profile.role = role
            user.profile.save(update_fields=["role"])
        return user


class MeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role")

    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]


class IssuerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issuer
        fields = "__all__"


class BondSerializer(serializers.ModelSerializer):
    issuer_name = serializers.CharField(source="issuer.name", read_only=True)
    issuer_country = serializers.CharField(source="issuer.country", read_only=True)
    credit_rating = serializers.CharField(source="issuer.credit_rating", read_only=True)
    issuer_industry = serializers.CharField(source="issuer.industry", read_only=True)

    class Meta:
        model = Bond
        fields = [
            "id",
            "isin",
            "issuer_country",
            "issuer",
            "issuer_industry",
            "issuer_name",
            "credit_rating",
            "bond_type",
            "face_value",
            "coupon_rate",
            "issue_date",
            "maturity_date",
            "created_at",
            "updated_at",
        ]


class TransactionSerializer(serializers.ModelSerializer):
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
            "created_at",
        ]
        read_only_fields = ["user", "username"]
