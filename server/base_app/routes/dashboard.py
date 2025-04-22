from django.urls import path

from base_app.views.dashboard import BaseSiteSettingsAPIView, UploadResumeAPIView, UploadAvatarAPIView


urlpatterns = [
    path("", BaseSiteSettingsAPIView.as_view()),
    # Upload resume
    path("upload-resume/", UploadResumeAPIView.as_view()),
    path("upload-avatar/", UploadAvatarAPIView.as_view()),
]
