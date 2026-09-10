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
    origins = settings.cors_origin_list
    is_dev = settings.debug or settings.app_env.lower() in {"development", "dev", "local"}
    if is_dev:
        # Dev only: allow any local Vite port via regex. Do not also set
        # allow_origins here — Starlette evaluates both, but a single mode
        # keeps behaviour predictable for local frontends.
        cors_kwargs["allow_origin_regex"] = r"http://(localhost|127\.0\.0\.1)(:\d+)?"
        # Still honour any non-localhost entries from CORS_ORIGINS (e.g. preview URLs).
        extra = [o for o in origins if "localhost" not in o and "127.0.0.1" not in o]
        if extra:
            cors_kwargs["allow_origins"] = extra
    else:
        # Production: explicit allow-list only (set CORS_ORIGINS to your frontend URL).
        cors_kwargs["allow_origins"] = origins or []
    app.add_middleware(CORSMiddleware, **cors_kwargs)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    uploads = BACKEND_ROOT / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads)), name="uploads")
    return app


app = create_app()
