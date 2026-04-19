"""Runtime configuration loaded from environment variables.

Spec reference: §4.1 (stack), §7.2 (JWT TTL), §14.5 (CORS, rate-limit).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- runtime ---
    ENV: Literal["local", "dev", "staging", "production", "test"] = "local"
    LOG_LEVEL: str = "INFO"

    # --- database ---
    DATABASE_URL: str = (
        "postgresql+asyncpg://deliphone:deliphone@localhost:5432/deliphone"
    )
    DATABASE_URL_SYNC: str = (
        "postgresql+psycopg://deliphone:deliphone@localhost:5432/deliphone"
    )

    # --- redis / celery ---
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # --- S3 / MinIO ---
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "deliphone"
    S3_REGION: str = "ru-central-1"

    # --- auth / JWT ---
    JWT_SECRET: str = "change-me"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 30
    JWT_TEMP_TTL_MINUTES: int = 5

    # --- Telegram bot ---
    TG_BOT_TOKEN: str = ""
    TG_BOT_USERNAME: str = ""
    TG_BOT_DRY_RUN: bool = True

    # --- KYC encryption (32-byte base64 key) ---
    KYC_ENCRYPTION_KEY: str = ""

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # --- external providers (blank until wired in later phases) ---
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_WEBHOOK_SECRET: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = Field(default="mailto:admin@deliphone.local")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
