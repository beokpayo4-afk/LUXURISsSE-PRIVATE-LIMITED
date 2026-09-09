"""Test fixtures — SQLite in-memory so checks run without PostgreSQL."""

import os

# Must be set before app imports that call get_settings().
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-min-16-chars"
os.environ["APP_ENV"] = "test"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
# Ensure pydantic Settings picks test env even if a real .env exists.
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "14"
os.environ["PASSWORD_RESET_EXPIRE_MINUTES"] = "30"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db, get_engine, get_session_factory
from app.main import create_app
from app.models.enums import UserRole
from app.models.auth import User


@pytest.fixture()
def client():
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()

    # Force a shared in-memory SQLite connection across sessions.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        # Seed admin for role tests
        db: Session = TestingSessionLocal()
        admin = User(
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=hash_password("AdminPass123"),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        db.close()
        yield test_client

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
