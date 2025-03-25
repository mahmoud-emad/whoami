from base_app.models.articles import Articles
from rest_framework.serializers import ModelSerializer


class ArticlesSerializers(ModelSerializer):
    """
    Serializer for articles
    """
    class Meta:
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'id', 'status']
        model = Articles
