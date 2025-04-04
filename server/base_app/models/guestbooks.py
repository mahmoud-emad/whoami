from django.db import models
from base_app.models.abstracts import CustomTimeStamp, StatusModelSelector


class Guestbooks(CustomTimeStamp):
    status = models.CharField(
        max_length=30,
        choices=StatusModelSelector.choices,
        default=StatusModelSelector.CREATED,
    )
    name = models.CharField(max_length=25)
    website = models.CharField(max_length=100)
    message = models.TextField(max_length=500)

    class Meta:
        app_label = "base_app"
        db_table = "guestbooks"

    def __str__(self):
        return f"{self.name} - {self.created_at}"
