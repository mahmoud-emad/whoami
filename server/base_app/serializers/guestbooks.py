
from base_app.models.guestbooks import Guestbooks
from rest_framework.serializers import ModelSerializer


class GuestbooksSerializers(ModelSerializer):
    class Meta:
        fields = ['id', 'name', 'website', 'message', 'created_at']
        model = Guestbooks
