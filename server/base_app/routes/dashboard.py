from django.urls import path

from base_app.views.dashboard import BaseSiteSettingsAPIView


urlpatterns = [
    path("", BaseSiteSettingsAPIView.as_view()),
]
