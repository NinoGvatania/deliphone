"""Celery application skeleton.

Tasks (auto-charges every 24 h, KYC reminders, etc.) land in this package
during later phases — see SPEC.md §3.2 «Event-driven критичные процессы».
"""

from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "deliphone",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_default_queue="default",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Moscow",
    enable_utc=True,
)

# Beat schedule — filled in during the payments phase.
celery_app.conf.beat_schedule = {}
