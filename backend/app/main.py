"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import BACKEND_ROOT, get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=(
            "Tour & Travels platform API for LUXURISSE PRIVATE LIMITED. "
            "Foundation phase — modular domain endpoints with JWT role-based access."
        ),
    )
    cors_kwargs: dict = {
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
    # Always honour explicit CORS_ORIGINS (production frontend URLs, etc.).
    origins = settings.cors_origin_list
    if origins:
        cors_kwargs["allow_origins"] = origins
    # Always allow local Vite (any port) so localhost frontends can call a
    # deployed API during development without CORS failures.
    cors_kwargs["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
    app.add_middleware(CORSMiddleware, **cors_kwargs)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    uploads = BACKEND_ROOT / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads)), name="uploads")
    return app


app = create_app()
