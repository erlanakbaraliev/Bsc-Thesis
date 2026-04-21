from rest_framework import permissions

from .models import UserProfile


def user_role(user):
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, "profile", None)
    return profile.role if profile else UserProfile.ROLE_VIEWER


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return user_role(request.user) == UserProfile.ROLE_ADMIN


class CanWriteReferenceData(permissions.BasePermission):
    def has_permission(self, request, view):
        role = user_role(request.user)
        return role in {UserProfile.ROLE_ADMIN, UserProfile.ROLE_EDITOR}


class CanImportExportBonds(permissions.BasePermission):
    def has_permission(self, request, view):
        role = user_role(request.user)
        return role in {UserProfile.ROLE_ADMIN, UserProfile.ROLE_EDITOR}


class CanCreateTransaction(permissions.BasePermission):
    def has_permission(self, request, view):
        role = user_role(request.user)
        return role in {UserProfile.ROLE_ADMIN, UserProfile.ROLE_EDITOR}


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        role = user_role(request.user)
        if role == UserProfile.ROLE_ADMIN:
            return True
        return obj.user_id == request.user.id
