from django.db import models
from base_app.models.abstracts import CustomTimeStamp, StatusModelSelector


class Articles(CustomTimeStamp):
    """
    Articles Model, extends from CustomTimeStamp
    """

    status = models.CharField(
        max_length=30,
        choices=StatusModelSelector.choices,
        default=StatusModelSelector.CREATED,
    )
    title = models.CharField(max_length=25)
    link = models.CharField(max_length=100)
    description = models.TextField(max_length=500)

    class Meta:
        db_table = "articles"

    def __str__(self):
        return f"{self.title} - {self.created_at}"
