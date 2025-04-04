
from pydoc import isdata
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.request import Request

from base_app.api.response import CustomResponse
from base_app.serializers.dashboard import UserSettingsSerializer
from base_app.models.abstracts import StatusModelSelector
from base_app.models.dashboard import PersonalSettings
from base_app.api.pagination import UserSettingsPagination

class UserSettingsAPIView(ListAPIView, APIView):
    """
    User Settings API View
    """
    serializer_class = UserSettingsSerializer
    pagination_class = UserSettingsPagination

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

    def get_queryset(self) -> CustomResponse:
        """
        Get users settings
        """
        page_size = self.request.query_params.get("page_size")
        self.pagination_class.page_size = int(page_size or 10)

        queryset = PersonalSettings.objects.filter(
            status=StatusModelSelector.CREATED
        ).order_by("-created_at")

        return queryset

class UserSettingsActionsAPIView(APIView):
    """
    User Settings API View
    """
    serializer_class = UserSettingsSerializer

    def get(self, request: Request, id: str) -> CustomResponse:
        """
        Get user settings baed on `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be number")

        settings = PersonalSettings.objects.filter(
            id=id
        ).first()
    
        if settings is None:
            return CustomResponse.not_found(message="User settings not found")

        return CustomResponse.success(
            data=self.serializer_class(settings).data, message="User settings found"
        )

    def delete(self, request: Request, id: str) -> CustomResponse:
        """
        Delete user settings baed on `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be number")

        settings = PersonalSettings.objects.filter(
            id=id
        ).first()
    
        if settings is None:
            return CustomResponse.not_found(message="User settings not found")

        settings.status = StatusModelSelector.DELETED
        settings.save()

        return CustomResponse.success(message="User settings deleted", status_code=204)

    def put(self, request: Request, id: str) -> CustomResponse:
        """
        Update user settings baed on `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be number")

        settings = PersonalSettings.objects.filter(
            id=id
        ).first()
    
        if settings is None:
            return CustomResponse.not_found(message="User settings not found")

        serializer = self.serializer_class(instance=settings, data=request.data)
        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()

        return CustomResponse.success(
            message="User settings updated",
            data=self.serializer_class(settings).data,
        )
