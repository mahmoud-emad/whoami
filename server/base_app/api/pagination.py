from rest_framework.pagination import PageNumberPagination

class GuestbooksPagination(PageNumberPagination):
    """
    Custom pagination class for Guestbooks.
    """
    page_size = 10

class ArticlesPagination(PageNumberPagination):
    """
    Custom pagination class for Guestbooks.
    """
    page_size = 10
