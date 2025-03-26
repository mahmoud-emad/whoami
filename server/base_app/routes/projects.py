from django.urls import path

from base_app.views.articles import BaseArticlesAPIView, ArticlesActionsAPIView


urlpatterns = [
    path("", BaseArticlesAPIView.as_view()),
    path("<str:id>/", ArticlesActionsAPIView.as_view()),
    # Tags
    path("tags/", BaseArticlesAPIView.as_view()),
    path("tags/<str:id>/", ArticlesActionsAPIView.as_view()),
]