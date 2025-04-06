from django.db import models
from base_app.models.abstracts import CustomTimeStamp, StatusModelSelector



class AdminConfiguration(CustomTimeStamp):
    display_admin_dashboard = models.BooleanField(
        default=True, help_text="Enable admin dashboard"
    )
    display_navbar_image = models.BooleanField(
        default=True, help_text="Show image in navigation bar"
    )
    multiple_themes = models.BooleanField(
        default=False, help_text="Allow multiple theme selection"
    )
    enable_search = models.BooleanField(
        default=True, help_text="Enable search functionality"
    )
    SEARCH_MODELS_CHOICES = (
        ("projects", "Projects"),
        ("guestbooks", "Guestbooks"),
        ("articles", "Articles"),
        ("posts", "Posts"),
    )
    search_models = models.JSONField(
        default=list, help_text="List of searchable models", blank=True
    )

    class Meta:
        verbose_name = "Admin Configuration"
        verbose_name_plural = "Configurations"
        db_table = "admin_configurations"

    def __str__(self):
        return "Site Configuration"


class ThemeSelector(models.TextChoices):
    """
    Project types
    """

    DARK = "dark"
    LIGHT = "light"


class Theme(CustomTimeStamp):
    """
    Site theme configuration
    """

    default_theme = models.CharField(
        max_length=30,
        choices=ThemeSelector,
        default=ThemeSelector.LIGHT,
        help_text="Default site theme",
    )

    class Meta:
        verbose_name = "Theme"
        verbose_name_plural = "Themes"
        db_table = "themes"

    def __str__(self):
        return f"Default Theme: {self.default_theme}"


class Security(CustomTimeStamp):
    """
    Site security configuration
    """

    debug = models.BooleanField(
        default=False, help_text="Enable debug mode (not recommended for production)"
    )
    admin_fingerprint_signature = models.CharField(
        max_length=255,
        help_text="Security signature for admin authentication",
        blank=True,
    )

    class Meta:
        verbose_name = "Security Setting"
        verbose_name_plural = "Security Settings"
        db_table = "security"

    def __str__(self):
        return "Security Configuration"


class SocialProfile(CustomTimeStamp):
    """
    Social profile configuration
    """

    github = models.URLField(max_length=255, help_text="GitHub profile URL")
    linkedin = models.URLField(max_length=255, help_text="LinkedIn profile URL")
    twitter = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Twitter profile URL (optional)",
    )
    whatsapp = models.CharField(
        max_length=50, blank=True, null=True, help_text="WhatsApp number (optional)"
    )
    signal = models.CharField(
        max_length=50, blank=True, null=True, help_text="Signal number (optional)"
    )
    telegram = models.CharField(
        max_length=50, blank=True, null=True, help_text="Telegram handle (optional)"
    )

    class Meta:
        verbose_name = "Social Profile"
        verbose_name_plural = "Social Profiles"
        db_table = "social_profiles"

    def __str__(self):
        return f"Social Profile (GitHub: {self.github})"


class PersonalSettings(CustomTimeStamp):
    """
    Personal profile configuration
    """
    status = models.CharField(
        max_length=30,
        choices=StatusModelSelector.choices,
        default=StatusModelSelector.CREATED,
    )
    full_name = models.CharField(max_length=100, help_text="Full name")
    email = models.EmailField(help_text="Contact email address")
    country = models.CharField(max_length=100, help_text="Country of residence")
    resume_url = models.URLField(
        max_length=255, blank=True, null=True, help_text="URL to resume (optional)"
    )
    social = models.OneToOneField(
        SocialProfile,
        on_delete=models.CASCADE,
        related_name="personal_settings",
        help_text="Social media profiles",
    )

    class Meta:
        verbose_name = "Personal Setting"
        verbose_name_plural = "Personal Settings"
        db_table = "personal_settings"

    def __str__(self):
        return self.full_name


class SiteSettings(CustomTimeStamp):
    configuration = models.OneToOneField(
        AdminConfiguration,
        on_delete=models.CASCADE,
        related_name="site_settings_configuration",
    )
    theme = models.OneToOneField(
        Theme,
        on_delete=models.CASCADE,
        related_name="site_settings_theme",
    )
    security = models.OneToOneField(
        Security,
        on_delete=models.CASCADE,
        related_name="site_settings_security",
    )
    personal = models.OneToOneField(
        PersonalSettings,
        on_delete=models.CASCADE,
        related_name="site_settings_personal",
    )

    class Meta:
        verbose_name = "Site Setting"
        verbose_name_plural = "Site Settings"
        db_table = "site_settings"

    def __str__(self):
        return "Site Settings"
