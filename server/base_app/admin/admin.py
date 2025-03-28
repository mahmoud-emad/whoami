# Admin configuration
from django.contrib import admin

from base_app.models.dashboard import (
    AdminConfiguration,
    PersonalSettings,
    SocialProfile,
    SiteSettings,
    Security,
    Theme,
)

# Check if the model is already registered
try:
    admin.site._registry[SiteSettings]

    # If we get here, the model is already registered
    class SiteSettingsAdmin(admin.ModelAdmin):
        list_display = ("personal_full_name",)
        fieldsets = (
            (
                "Overview",
                {"fields": (("configuration",), ("theme", "security"), "personal")},
            ),
        )

        def personal_full_name(self, obj):
            return obj.personal.full_name

        personal_full_name.short_description = "Owner"

        def theme_default(self, obj):
            return obj.theme.default_theme

        theme_default.short_description = "Theme"

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(SiteSettings)
    class SiteSettingsAdmin(admin.ModelAdmin):
        list_display = ("personal_full_name",)
        fieldsets = (
            (
                "Overview",
                {"fields": (("configuration",), ("theme", "security"), "personal")},
            ),
        )

        def personal_full_name(self, obj):
            return obj.personal.full_name

        personal_full_name.short_description = "Owner"

        def theme_default(self, obj):
            return obj.theme.default_theme

        theme_default.short_description = "Theme"


# Check if the model is already registered
try:
    admin.site._registry[AdminConfiguration]

    # If we get here, the model is already registered
    class ConfigurationAdmin(admin.ModelAdmin):
        list_display = (
            "display_admin_dashboard",
            "display_navbar_image",
            "enable_search",
            "search_models_list",
        )

        def search_models_list(self, obj):
            return ", ".join(obj.search_models) if obj.search_models else "None"

        search_models_list.short_description = "Search Models"

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(AdminConfiguration)
    class ConfigurationAdmin(admin.ModelAdmin):
        list_display = (
            "display_admin_dashboard",
            "display_navbar_image",
            "enable_search",
            "search_models_list",
        )

        def search_models_list(self, obj):
            return ", ".join(obj.search_models) if obj.search_models else "None"

        search_models_list.short_description = "Search Models"


# Check if the model is already registered
try:
    admin.site._registry[Theme]

    # If we get here, the model is already registered
    class ThemeAdmin(admin.ModelAdmin):
        list_display = ("default_theme",)

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(Theme)
    class ThemeAdmin(admin.ModelAdmin):
        list_display = ("default_theme",)


# Check if the model is already registered
try:
    admin.site._registry[Security]

    # If we get here, the model is already registered
    class SecurityAdmin(admin.ModelAdmin):
        list_display = ("debug", "admin_fingerprint_signature")

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(Security)
    class SecurityAdmin(admin.ModelAdmin):
        list_display = ("debug", "admin_fingerprint_signature")


# Check if the model is already registered
try:
    admin.site._registry[PersonalSettings]

    # If we get here, the model is already registered
    class PersonalSettingsAdmin(admin.ModelAdmin):
        list_display = ("full_name", "email", "country")
        fieldsets = (
            (
                "Personal Info",
                {"fields": ("full_name", "email", "country", "resume_url")},
            ),
            ("Social Profiles", {"fields": ("social",)}),
        )

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(PersonalSettings)
    class PersonalSettingsAdmin(admin.ModelAdmin):
        list_display = ("full_name", "email", "country")
        fieldsets = (
            (
                "Personal Info",
                {"fields": ("full_name", "email", "country", "resume_url")},
            ),
            ("Social Profiles", {"fields": ("social",)}),
        )


# Check if the model is already registered
try:
    admin.site._registry[SocialProfile]

    # If we get here, the model is already registered
    class SocialProfileAdmin(admin.ModelAdmin):
        list_display = ("github", "linkedin", "twitter")

except KeyError:
    # If we get here, the model is not registered yet
    @admin.register(SocialProfile)
    class SocialProfileAdmin(admin.ModelAdmin):
        list_display = ("github", "linkedin", "twitter")
