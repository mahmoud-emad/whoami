from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from base_app.api.response import CustomResponse
from base_app.models.guestbooks import Guestbooks
from base_app.models.abstracts import StatusModelSelector
from base_app.serializers.guestbooks import GuestbooksSerializers
from base_app.api.pagination import GuestbooksPagination


class BaseGuestbooksAPIView(ListAPIView, APIView):
    serializer_class = GuestbooksSerializers
    pagination_class = GuestbooksPagination

    def get_queryset(self):
        """
        **Get guestbooks, filter by `status` and order by `created_at`**:
            - status: CREATED
            - order by created_at\n
        You can pass `page_size` as query param to custom pagination
        """
        page_size = self.request.query_params.get('page_size')
        self.pagination_class.page_size = int(page_size or 10)

        queryset = Guestbooks.objects.filter(
            status=StatusModelSelector.CREATED
        ).order_by('-created_at')
        return queryset

    def post(self, request: Request) -> CustomResponse:
        """
            Create guestbook, pass `name`, `website` and `message`
        """
        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message='Make sure you entered a valid data'
            )

        serializer.save()
        return CustomResponse.success(
            data=serializer.data,
            message='Guestbook created',
            status_code=201
        )

class GuestbooksActionsAPIView(ListAPIView, APIView):
    """Guestbooks API View"""
    serializer_class = GuestbooksSerializers

    def get(self, request: Request, id: str) -> CustomResponse:
        """
        Get guestbook by `id`
        """
        if not str(id).isdigit():
            return CustomResponse.bad_request(
                message='Id must be a number'
            )

        guestbook = Guestbooks.objects.filter(
            id=id,
            status=StatusModelSelector.CREATED
        ).first()

        if not guestbook:
            return CustomResponse.not_found(
                message='Guestbook not found'
            )

        return CustomResponse.success(
            data=self.serializer_class(guestbook).data,
            message='Guestbook found'
        )

    def delete(self, request: Request, id: str) -> CustomResponse:
        """Delete guestbook by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(
                message='Id must be a number'
            )

        guestbook = Guestbooks.objects.filter(
            id=id,
            status=StatusModelSelector.CREATED
        ).first()

        if not guestbook:
            return CustomResponse.not_found(
                message='Guestbook not found'
            )

        guestbook.status = StatusModelSelector.DELETED
        guestbook.save()

        return CustomResponse.success(
            message='Guestbook deleted',
            status_code=204
        )

    def put(self, request: Request, id: str) -> CustomResponse:
        """Update guestbook by `id`"""
        if not str(id).isdigit():
            return CustomResponse.bad_request(
                message='Id must be a number'
            )

        guestbook = Guestbooks.objects.filter(
            id=id,
        ).first()

        if not guestbook:
            return CustomResponse.not_found(
                message='Guestbook not found'
            )

        serializer = self.serializer_class(instance=guestbook, data=request.data)
        if not serializer.is_valid():
            return CustomResponse.bad_request(
                message='Make sure you entered a valid data'
            )

        serializer.save()

        return CustomResponse.success(
            message='Guestbook updated',
            data=self.serializer_class(guestbook).data,
        )

    def patch(self, request: Request, id: str) -> CustomResponse:
        """Update guestbook by `id`"""
        return self.put(request, id)
