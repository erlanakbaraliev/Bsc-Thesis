from django.contrib.auth.models import User
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import Response

from .models import Bond, Issuer, Transaction
from .serializers import (
    BondSerializer,
    IssuerSerializer,
    TransactionSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class IssuerViewSet(viewsets.ModelViewSet):
    """API endpoint"""

    queryset = Issuer.objects.all()
    serializer_class = IssuerSerializer
    permission_classes = [permissions.AllowAny]


class BondViewSet(viewsets.ModelViewSet):
    queryset = Bond.objects.all()
    serializer_class = BondSerializer
    permission_classes = [permissions.IsAuthenticated]


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def meta(request):
    return Response(
        {
            "credit_ratings": [{"id": k, "name": v} for k, v in Issuer.RATING_CHOICES],
            "industries": [{"id": k, "name": v} for k, v in Issuer.INDUSTRY_CHOICES],
            "bond_types": [{"id": k, "name": v} for k, v in Bond.TYPE_CHOICES],
        }
    )
