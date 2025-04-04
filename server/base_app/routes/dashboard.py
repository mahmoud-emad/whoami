from django.urls import path

from base_app.views.dashboard import UserSettingsAPIView, UserSettingsActionsAPIView


urlpatterns = [
    path("user_info/", UserSettingsAPIView.as_view()),
    path("user_info/<str:id>/", UserSettingsActionsAPIView.as_view()),
]
