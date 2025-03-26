from django.db import models
from base_app.models.abstracts import CustomTimeStamp, StatusModelSelector


class ProjectTypeSelector(models.TextChoices):
    """
    Project types
    """

    PROJECT = "Project", "project"
    PACKAGE = "Package", "package"

class ProjectTags(CustomTimeStamp):
    """
    Project tags model
    """
    name = models.CharField(max_length=25)
    description = models.TextField(max_length=500)

    class Meta:
        db_table = "project_tags"

    def __str__(self):
        return f"{self.name} - {self.created_at}"


class Projects(CustomTimeStamp):
    """
    Projects
    """
    status = models.CharField(
        max_length=30,
        choices=StatusModelSelector.choices,
        default=StatusModelSelector.CREATED,
    )
    title = models.CharField(max_length=25)
    link = models.CharField(max_length=100)
    tags = models.ManyToManyField("ProjectTags", blank=True, related_name="project_tags")
    description = models.TextField(max_length=500)
    type = models.CharField(
        max_length=30,
        choices=ProjectTypeSelector.choices,
        default=ProjectTypeSelector.PROJECT,
    )
    

    class Meta:
        db_table = "projects"

    def __str__(self):
        return f"{self.title} - {self.created_at}"
