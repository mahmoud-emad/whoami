from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from base_app.api.response import CustomResponse
from base_app.models.projects import ProjectTags, Projects
from base_app.models.abstracts import StatusModelSelector
from base_app.serializers.projects import ProjectsSerializers, ProjectTagsSerializers
from base_app.api.pagination import ProjectPagination, ProjectTagsPagination


class BaseProjectsAPIView(ListAPIView, APIView):
    serializer_class = ProjectsSerializers
    pagination_class = ProjectPagination

    def get_queryset(self):
        """
        **Get projects, filter by `status` and order by `created_at`**:
            - status: CREATED
            - order by created_at\n
        You can pass `page_size` as query param to custom pagination
        """
        page_size = self.request.query_params.get("page_size")
        self.pagination_class.page_size = int(page_size or 10)

        queryset = Projects.objects.filter(status=StatusModelSelector.CREATED).order_by(
            "-created_at"
        )
        return queryset

    def post(self, request: Request) -> CustomResponse:
        """
        Create project, pass `title`, `link`, `tags`, `description` and `type`
        """
        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()
        return CustomResponse.success(
            data=serializer.data, message="Project created", status_code=201
        )


class ProjectsActionsAPIView(APIView):
    """Projects API View"""

    serializer_class = ProjectsSerializers
    pagination_class = ProjectPagination

    def get(self, request: Request, id: str) -> CustomResponse:
        """
        Get project by `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        project = Projects.objects.filter(
            id=id, status=StatusModelSelector.CREATED
        ).first()

        if not project:
            return CustomResponse.not_found(message="Project not found")

        return CustomResponse.success(
            data=self.serializer_class(project).data, message="Project found"
        )

    def delete(self, request: Request, id: str) -> CustomResponse:
        """Delete project by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        project = Projects.objects.filter(
            id=id, status=StatusModelSelector.CREATED
        ).first()

        if not project:
            return CustomResponse.not_found(message="Project not found")

        project.status = StatusModelSelector.DELETED
        project.save()

        return CustomResponse.success(message="Projects deleted", status_code=204)

    def put(self, request: Request, id: str) -> CustomResponse:
        """Update project by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        project = Projects.objects.filter(
            id=id,
        ).first()

        if not project:
            return CustomResponse.not_found(message="Project not found")

        serializer = self.serializer_class(instance=project, data=request.data)
        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()

        return CustomResponse.success(
            message="Project updated",
            data=self.serializer_class(project).data,
        )

    def patch(self, request: Request, id: str) -> CustomResponse:
        """Update project by `id`"""
        return self.put(request, id)


class BaseProjectTagsAPIView(ListAPIView, APIView):
    serializer_class = ProjectTagsSerializers
    pagination_class = ProjectTagsPagination

    def get_queryset(self):
        """
        **Get projects, filter by order by `created_at`**:
            - order by created_at\n
        You can pass `page_size` as query param to custom pagination
        """
        page_size = self.request.query_params.get("page_size")
        self.pagination_class.page_size = int(page_size or 50)

        queryset = ProjectTags.objects.all().order_by("-created_at")
        return queryset

    def post(self, request: Request) -> CustomResponse:
        """
        Create project, pass `name` as project tag name and `description`
        """
        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()
        return CustomResponse.success(
            data=serializer.data, message="Project tag created", status_code=201
        )


class ProjectTagsActionsAPIView(APIView):
    """Project tags actions API View"""

    serializer_class = ProjectTagsSerializers
    pagination_class = ProjectTagsPagination

    def get(self, request: Request, id: str) -> CustomResponse:
        """
        Get project tag by `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        tag = ProjectTags.objects.filter(
            id=id,
        ).first()

        if not tag:
            return CustomResponse.not_found(message="Project tag not found")

        return CustomResponse.success(
            data=self.serializer_class(tag).data, message="Project tag found"
        )

    def delete(self, request: Request, id: str) -> CustomResponse:
        """Delete project tag by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        tag = ProjectTags.objects.filter(
            id=id,
        ).first()

        if not tag:
            return CustomResponse.not_found(message="Project not found")

        tag.delete()

        return CustomResponse.success(message="Projects deleted", status_code=204)
