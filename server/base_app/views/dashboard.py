import os
from rest_framework.views import APIView
from rest_framework.request import Request

from base_app.api.response import CustomResponse
from base_app.serializers.dashboard import SiteSettingsSerializer
from base_app.models.abstracts import StatusModelSelector
from base_app.models.dashboard import (
    AdminConfiguration,
    PersonalSettings,
    Security,
    SiteSettings,
    SocialProfile,
    Theme,
)
from django.conf import settings
from django.core.files.storage import FileSystemStorage


class BaseSiteSettingsAPIView(APIView):
    """
    Base site settings API View
    """
    serializer_class = SiteSettingsSerializer

    def post(self, request: Request) -> CustomResponse:
        """
        Create a new site settings
        """
        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered valid data", error=serializer.errors
            )

        validated = serializer.validated_data

        # Create nested objects
        configuration = AdminConfiguration.objects.create(**validated["configuration"])
        theme = Theme.objects.create(**validated["theme"])
        security = Security.objects.create(**validated["security"])
        social = SocialProfile.objects.create(**validated["personal"]["social"])

        personal_data = validated["personal"]
        personal = PersonalSettings.objects.create(
            full_name=personal_data.get("full_name"),
            email=personal_data.get("email"),
            country=personal_data.get("country"),
            resume_url=personal_data.get("resume_url"),
            social=social,
        )

        # Save SiteSettings
        serializer.save(
            configuration=configuration,
            theme=theme,
            security=security,
            personal=personal,
        )

        return CustomResponse.success(
            data=serializer.data,
            message="Site settings created",
            status_code=201,
        )

    def get(self, request: Request) -> CustomResponse:
        """
        Get site settings
        """
        settings = SiteSettings.objects.filter(
            personal__status=StatusModelSelector.CREATED
        ).first()

        if settings is None:
            return CustomResponse.not_found(message="Site settings not found")

        return CustomResponse.success(
            data=self.serializer_class(settings).data,
            message="Site settings found",
        )

    def put(self, request: Request) -> CustomResponse:
        """
        Update site settings. Accepts partial updates.
        """
        settings = SiteSettings.objects.first()
        if settings is None:
            return CustomResponse.not_found(message="Site settings not found")

        data = request.data
        self._update_nested(settings, data)
        settings.save()

        return CustomResponse.success(
            data=self.serializer_class(settings).data,
            message="Site settings updated",
        )

    def patch(self, request: Request) -> CustomResponse:
        """
        Alias for PUT: handles partial update
        """
        return self.put(request)

    def _update_nested(self, settings: SiteSettings, data: dict):
        """
        Helper method to update nested settings objects
        """
        mapping = {
            "configuration": settings.configuration,
            "theme": settings.theme,
            "security": settings.security,
            "personal": settings.personal,
            "social": settings.personal.social if settings.personal else None,
        }

        for key, value in data.items():
            target = mapping.get(key)
            if target and isinstance(value, dict):
                for attr, attr_value in value.items():
                    setattr(target, attr, attr_value)
                target.save()


class UploadResumeAPIView(APIView):
    MAX_FILE_SIZE_MB = 7
    ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']

    def post(self, request: Request) -> CustomResponse:
        user = request.user
        file = request.FILES.get("file")

        if not file:
            return CustomResponse.bad_request(message="File not found", error="file")

        # Validate file size (7MB max)
        file_size_mb = file.size / (1024 * 1024)
        if file_size_mb > self.MAX_FILE_SIZE_MB:
            return CustomResponse.bad_request(
                message="File size exceeds the 7MB limit.",
                error="file_size"
            )

        # Validate file extension
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return CustomResponse.bad_request(
                message="Unsupported file format. Only PDF, DOC, DOCX are allowed.",
                error="file_type"
            )

        # Set the directory
        resume_dir = os.path.join(settings.MEDIA_ROOT, "user_resume")
        if os.path.exists(resume_dir):
            # Remove old resume if exists
            for f in os.listdir(resume_dir):
                os.remove(os.path.join(resume_dir, f))

        os.makedirs(resume_dir, exist_ok=True)

        # Construct filename
        full_path = os.path.join(resume_dir, file.name)

        # Remove old resume if exists
        if os.path.exists(full_path):
            os.remove(full_path)

        # Save file
        fs = FileSystemStorage(location=resume_dir)
        fs.save(file.name, file)
        file_url = fs.url(os.path.join("user_resume", file.name))

        return CustomResponse.success(data={"url": file_url}, message="Resume uploaded successfully")

class UploadAvatarAPIView(APIView):
    MAX_FILE_SIZE_MB = 2
    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

    def post(self, request: Request) -> CustomResponse:
        user = request.user
        file = request.FILES.get("file")

        if not file:
            return CustomResponse.bad_request(message="File not found", error="file")

        # Validate file size (2MB max)
        file_size_mb = file.size / (1024 * 1024)
        if file_size_mb > self.MAX_FILE_SIZE_MB:
            return CustomResponse.bad_request(
                message="File size exceeds the 2MB limit.",
                error="file_size"
            )

        # Validate file extension
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return CustomResponse.bad_request(
                message="Unsupported file format. Only JPG, PNG, and WEBP are allowed.",
                error="file_type"
            )

        # Set the directory
        avatar_dir = os.path.join(settings.MEDIA_ROOT, "user_avatar")
        os.makedirs(avatar_dir, exist_ok=True)

        # Construct unique filename
        # filename = f"{user.username}_avatar{ext}"
        full_path = os.path.join(avatar_dir, file.name)

        # Remove old avatar if exists
        if os.path.exists(full_path):
            os.remove(full_path)

        # Save file
        fs = FileSystemStorage(location=avatar_dir)
        fs.save(file.name, file)
        file_url = fs.url(os.path.join("user_avatar", file.name))

        return CustomResponse.success(data={"url": file_url}, message="Avatar uploaded successfully")
