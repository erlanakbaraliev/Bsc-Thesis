from django.contrib import admin

from .models import Bond, Issuer, Transaction

admin.site.register(Issuer)
admin.site.register(Bond)
admin.site.register(Transaction)
