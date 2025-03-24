"""abstract model for created, updated timestamps"""

from django.db import models

class StatusModelSelector(models.TextChoices):
    """
    Status model selector
    """

    CREATED = "Created", "created"
    DELETED = "Deleted", "deleted"


class CustomTimeStamp(models.Model):
    """Database model for created and updated timestamps"""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "base_app"
        abstract = True

    def __str__(self) -> str:
        return f"""created at : {self.created_at} ,
            modified at : {self.modified_at}"""
