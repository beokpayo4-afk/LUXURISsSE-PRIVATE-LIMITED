"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env from the backend package root, not process cwd
# (uvicorn --reload workers on Windows can start with a different cwd).
# Reload settings after .env changes by restarting uvicorn.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LUXURISSE PRIVATE LIMITED"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        ...,
        description="SQLAlchemy database URL (postgresql+psycopg://...)",
    )

    jwt_secret_key: str = Field(..., min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    password_reset_expire_minutes: int = 30

    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"

    company_email: str = "pvtltdluxruisses@gmail.com"
    company_phone: str = "9294744219"
    company_address: str = (
        "Shop No-4, Telghani Naka, Kamal Super Bazar, "
        "Raipur Ganj, Raipur, Chhattisgarh - 492009"
    )
    company_md: str = "Lucky Nirmalkar"
    company_director: str = "Ajay Tarak"

    # Optional local admin bootstrap (development)
    admin_email: str | None = None
    admin_password: str | None = None

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Neon/Render often give postgres:// — this app uses psycopg3.

        Only rewrite bare ``postgres://`` / ``postgresql://`` URLs.
        Schemes that already include a driver (``postgresql+psycopg://``,
        ``postgresql+asyncpg://``, …) are left unchanged.
        """
        url = value.strip()
        lower = url.lower()
        if lower.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://") :]
        elif lower.startswith("postgresql://"):
            # Exact bare scheme only — ``postgresql+…://`` does not match here.
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        # channel_binding=require can break some PaaS/psycopg combinations
        url = url.replace("channel_binding=require&", "").replace("&channel_binding=require", "")
        url = url.replace("?channel_binding=require", "")
        return url

    @field_validator("jwt_secret_key")
    @classmethod
    def reject_placeholder_secret(cls, value: str) -> str:
        if value.startswith("CHANGE_ME"):
            raise ValueError(
                "JWT_SECRET_KEY must be set to a real secret in .env "
                "(not the CHANGE_ME placeholder)."
            )
        return value

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
