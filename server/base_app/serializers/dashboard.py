from rest_framework.serializers import ModelSerializer
from rest_framework.fields import CharField, EmailField, URLField

from base_app.models.dashboard import PersonalSettings

class UserSettingsSerializer(ModelSerializer):
    """
    Serializer for PersonalSettings model
    """

    class Meta:
        model = PersonalSettings
        fields = ['full_name', 'email', 'country', 'resume_url']
