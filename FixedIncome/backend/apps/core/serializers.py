from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Bond, Issuer, Transaction, UserProfile


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", required=False)
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "password"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.context.get("require_password"):
            self.fields["password"].required = True

    def validate_password(self, value):
        if not value:
            if self.context.get("require_password") and self.instance is None:
                raise serializers.ValidationError("This field is required.")
            return value
        user = self.instance or User(
            username=self.initial_data.get("username", ""),
            email=self.initial_data.get("email", ""),
        )
        validate_password(value, user=user)
        return value

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        password = validated_data.pop("password")
        role = profile_data.get("role", UserProfile.ROLE_VIEWER)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=password,
        )
        if role:
            user.profile.role = role
            user.profile.save(update_fields=["role"])
        return user

    def update(self, instance, validated_data):
        validated_data.pop("password", None)
        profile_data = validated_data.pop("profile", {})
        user = super().update(instance, validated_data)
        role = profile_data.get("role")
        if role is not None:
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
