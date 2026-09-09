"""ASGI entry shim so `uvicorn main:app` works from the backend folder."""

from app.main import app

__all__ = ["app"]
