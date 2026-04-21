from django.contrib import admin

from .models import Bond, Issuer, Transaction, UserProfile

admin.site.register(Issuer)
admin.site.register(Bond)
admin.site.register(Transaction)
admin.site.register(UserProfile)
