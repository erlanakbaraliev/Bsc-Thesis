from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_missing_profiles(apps, schema_editor):
    user_model = apps.get_model("auth", "User")
    profile_model = apps.get_model("core", "UserProfile")
    for user in user_model.objects.all():
        profile_model.objects.get_or_create(user=user)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_rename_transaction_date_transaction_created_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
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
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("ADMIN", "Admin"),
                            ("EDITOR", "Editor"),
                            ("VIEWER", "Viewer"),
                        ],
                        default="VIEWER",
                        max_length=10,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.RunPython(
            code=create_missing_profiles,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
