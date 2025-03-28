from base_app.models.guestbooks import Guestbooks
from rest_framework.serializers import ModelSerializer


class GuestbooksSerializers(ModelSerializer):
    """
    Serializer for guestbooks
    """

    class Meta:
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "id", "status"]
        model = Guestbooks
