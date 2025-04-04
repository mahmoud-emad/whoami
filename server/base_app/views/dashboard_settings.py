
from rest_framework.views import APIView
from rest_framework.request import Request

from base_app.api.response import CustomResponse
from base_app.serializers.dashboard_settings import UserSettingsSerializer

class UserSettingsAPIView(APIView):
    """
    User Settings API View
    """
    serializer_class = UserSettingsSerializer

    def post(self, request: Request) -> CustomResponse:
        """
        Create a new user settings, pass `full_name`, `email`, `resume_url` and `country` as user settings
        """

        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()
        return CustomResponse.success(
            data=serializer.data, message="User settings created", status_code=201
        )