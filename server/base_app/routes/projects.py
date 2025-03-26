from django.urls import path

from base_app.views.projects import (
    BaseProjectsAPIView,
    BaseProjectTagsAPIView,
    ProjectsActionsAPIView,
    ProjectTagsActionsAPIView
)


urlpatterns = [
    path("", BaseProjectsAPIView.as_view()),
    path("tags/", BaseProjectTagsAPIView.as_view()),
    path("<str:id>/", ProjectsActionsAPIView.as_view()),
    path("tags/<str:id>/", ProjectTagsActionsAPIView.as_view()),
]