from django.urls import path

from base_app.views.dashboard import UserSettingsAPIView


urlpatterns = [
    path("user_info/", UserSettingsAPIView.as_view()),
]
