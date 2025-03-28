from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from base_app.api.response import CustomResponse
from base_app.models.articles import Articles
from base_app.models.abstracts import StatusModelSelector
from base_app.serializers.articles import ArticlesSerializers
from base_app.api.pagination import ArticlesPagination


class BaseArticlesAPIView(ListAPIView, APIView):
    serializer_class = ArticlesSerializers
    pagination_class = ArticlesPagination

    def get_queryset(self):
        """
        **Get articles, filter by `status` and order by `created_at`**:
            - status: CREATED
            - order by created_at\n
        You can pass `page_size` as query param to custom pagination
        """
        page_size = self.request.query_params.get("page_size")
        self.pagination_class.page_size = int(page_size or 10)

        queryset = Articles.objects.filter(status=StatusModelSelector.CREATED).order_by(
            "-created_at"
        )
        return queryset

    def post(self, request: Request) -> CustomResponse:
        """
        Create article, pass `title`, `link` and `description`
        """
        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()
        return CustomResponse.success(
            data=serializer.data, message="Article created", status_code=201
        )


class ArticlesActionsAPIView(ListAPIView, APIView):
    """Articles API View"""

    serializer_class = ArticlesSerializers

    def get(self, request: Request, id: str) -> CustomResponse:
        """
        Get article by `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        article = Articles.objects.filter(
            id=id, status=StatusModelSelector.CREATED
        ).first()

        if not article:
            return CustomResponse.not_found(message="Article not found")

        return CustomResponse.success(
            data=self.serializer_class(article).data, message="Article found"
        )

    def delete(self, request: Request, id: str) -> CustomResponse:
        """Delete article by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        article = Articles.objects.filter(
            id=id, status=StatusModelSelector.CREATED
        ).first()

        if not article:
            return CustomResponse.not_found(message="Article not found")

        article.status = StatusModelSelector.DELETED
        article.save()

        return CustomResponse.success(message="Articles deleted", status_code=204)

    def put(self, request: Request, id: str) -> CustomResponse:
        """Update article by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(message="Id must be a number")

        article = Articles.objects.filter(
            id=id,
        ).first()

        if not article:
            return CustomResponse.not_found(message="Article not found")

        serializer = self.serializer_class(instance=article, data=request.data)
        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message="Make sure you entered a valid data", error=serializer.errors
            )

        serializer.save()

        return CustomResponse.success(
            message="Article updated",
            data=self.serializer_class(article).data,
        )

    def patch(self, request: Request, id: str) -> CustomResponse:
        """Update article by `id`"""
        return self.put(request, id)
