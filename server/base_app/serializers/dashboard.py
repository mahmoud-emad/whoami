from rest_framework.serializers import ModelSerializer, SerializerMethodField

from base_app.models.dashboard import (
    PersonalSettings,
    SiteSettings,
    AdminConfiguration,
    Theme,
    Security,
    SocialProfile,
)

class AdminConfigurationSerializer(ModelSerializer):
    """
    Serializer for AdminConfiguration model
    """

    class Meta:
        model = AdminConfiguration
        fields = [
            'display_admin_dashboard',
            'display_navbar_image',
            'multiple_themes',
            'enable_search',
            'search_models'
        ]
        read_only_fields = ['id',]

class ThemeSerializer(ModelSerializer):
    """
    Serializer for Theme model
    """

    class Meta:
        model = Theme
        fields = ['default_theme']
        read_only_fields = ['id',]

class SecuritySerializer(ModelSerializer):
    """
    Serializer for Security model
    """

    class Meta:
        model = Security
        fields = [
            'debug',
            'admin_fingerprint_signature'
        ]
        read_only_fields = ['id',]

class SocialProfileSerializer(ModelSerializer):
    """
    Serializer for SocialProfile model
    """

    class Meta:
        model = SocialProfile
        fields = [
            'github',
            'linkedin',
            'twitter',
            'whatsapp',
            'signal',
            'telegram'
        ]
        read_only_fields = ['id',]

class PersonalSettingsSerializer(ModelSerializer):
    """
    Serializer for PersonalSettings model
    """
    
    social = SocialProfileSerializer()

    class Meta:
        model = PersonalSettings
        fields = [
            'full_name',
            'email',
            'country',
            'social',
            'resume_url'
        ]
        read_only_fields = ['id',]

    # def get_social(self, obj):
    #     """
    #     Get social profile data
    #     """
    #     return SocialProfileSerializer(obj.social).data

class SiteSettingsSerializer(ModelSerializer):
    """
    Serializer for SiteSettings model
    """
    configuration = AdminConfigurationSerializer()
    theme = ThemeSerializer()
    security = SecuritySerializer()
    personal = PersonalSettingsSerializer()

    class Meta:
        model = SiteSettings
        fields = [
            'configuration',
            'theme',
            'security',
            'personal',
        ]
        read_only_fields = ['id',]

    # def get_configuration(self, obj):
    #     """
    #     Get admin configuration data
    #     """
    #     return AdminConfigurationSerializer(obj.get('configuration')).data

    # def get_theme(self, obj):
    #     """
    #     Get theme data
    #     """
    #     return ThemeSerializer(obj.get('theme')).data

    # def get_security(self, obj):
    #     """
    #     Get security data
    #     """
    #     return SecuritySerializer(obj.get('security')).data

    # def get_personal(self, obj):
    #     """
    #     Get personal data
    #     """
    #     return PersonalSettingsSerializer(obj.get('personal')).data

