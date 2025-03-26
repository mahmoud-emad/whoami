from django.contrib import admin
from django.urls import path, include
import settings
from django.conf.urls.static import static


urlpatterns = [
    # path("", HomeApiView.as_view()),
    # path("health/", HealthApiView.as_view()),
    path("admin/", admin.site.urls),
    path(
        "api/",
        include(
            [
                path("guestbooks/", include("base_app.routes.guestbooks")),
                path("articles/", include("base_app.routes.articles")),
                path("projects/", include("base_app.routes.projects")),
            ]
        ),
    ),
] + static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT,
)


if settings.DEBUG:
    import debug_toolbar
    from drf_yasg.views import get_schema_view
    from drf_yasg import openapi

    schema_view = get_schema_view(
        openapi.Info(
            title="Api Documentation",
            default_version="v1",
        ),
        public=False,
    )

    urlpatterns = [
        # URLs specific only to django-debug-toolbar:
        path("__debug__/", include(debug_toolbar.urls)),
        # Swagger
        path(
            "swagger/",
            schema_view.with_ui("swagger", cache_timeout=0),
            name="schema-swagger-ui",
        ),
        path(
            "redoc/",
            schema_view.with_ui("redoc", cache_timeout=0),
            name="schema-redoc",
        ),
        # noqa: DJ05
    ] + urlpatterns