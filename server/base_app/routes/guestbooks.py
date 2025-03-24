from django.urls import path

from base_app.views.guestbooks import BaseGuestbooksAPIView, GuestbooksActionsAPIView


urlpatterns = [
    path("", BaseGuestbooksAPIView.as_view()),
    path("<str:id>/", GuestbooksActionsAPIView.as_view()),
]