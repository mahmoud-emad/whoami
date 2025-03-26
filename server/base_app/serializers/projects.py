
from base_app.models.projects import Projects
from rest_framework.serializers import ModelSerializer

class ProjectsSerializers(ModelSerializer):
    """
    Serializer for projects
    """
    class Meta:
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'id', 'status']
        model = Projects
