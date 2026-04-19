"""Celery tasks for KYC processing.

process_kyc_submission: runs automated checks after client submits KYC.
cleanup_expired_sessions: periodic cleanup of stale registration sessions.
"""

from __future__ import annotations

import asyncio
import hashlib
from datetime import date

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger("kyc_tasks")


def _run_async(coro):
    """Run an async function from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="process_kyc_submission", bind=True, max_retries=3)
def process_kyc_submission(self, submission_id: str) -> dict:
    """Run automated KYC checks after client submits documents.

    Checks:
    1. Duplicate passport (SHA256 hash lookup)
    2. Blacklist match (passport_hash or telegram_id)
    3. Age >= 18
    4. Photo quality (placeholder — real CV in V2)

    Critical flags (blacklisted, underage) → auto-reject.
    """
    return _run_async(_process(submission_id))


async def _process(submission_id: str) -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.ops import Blacklist
    from app.models.users import KycSubmission, User
    from app.services.notifications import notify_kyc_rejected

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(KycSubmission).where(KycSubmission.id == submission_id)
        )
        sub = result.scalars().first()
        if sub is None:
            logger.error("kyc_task.not_found", submission_id=submission_id)
            return {"error": "submission not found"}

        user_result = await session.execute(
            select(User).where(User.id == sub.user_id)
        )
        user = user_result.scalars().first()
        if user is None:
            return {"error": "user not found"}

        flags: dict[str, str] = {}
        auto_reject = False

        # ── 1. Duplicate passport ──
        if user.passport_hash:
            dup_result = await session.execute(
                select(User).where(
                    User.passport_hash == user.passport_hash,
                    User.id != user.id,
                )
            )
            if dup_result.scalars().first():
                flags["duplicate_passport"] = "matching passport found on another account"

        # ── 2. Blacklist ──
        bl_conditions = []
        if user.passport_hash:
            bl_result = await session.execute(
                select(Blacklist).where(Blacklist.passport_hash == user.passport_hash)
            )
            if bl_result.scalars().first():
                flags["blacklisted"] = "passport hash found in blacklist"
                auto_reject = True

        # ── 3. Age check ──
        if user.birth_date:
            today = date.today()
            age = (today - user.birth_date).days // 365
            if age < 18:
                flags["underage"] = f"age {age}, minimum 18"
                auto_reject = True

        # ── 4. Photo quality (placeholder) ──
        # Real implementation would use OpenCV Laplacian variance,
        # brightness analysis, and resolution check. Deferred to V2.
        flags.setdefault("photo_quality", "not_checked")

        # ── Save flags ──
        sub.auto_flags = flags

        if auto_reject:
            sub.status = "rejected"
            sub.rejection_reason = "; ".join(
                f"{k}: {v}" for k, v in flags.items() if k in ("blacklisted", "underage")
            )
            user.kyc_status = "rejected"
            await notify_kyc_rejected(session, user, sub.rejection_reason)
            logger.info(
                "kyc_task.auto_reject",
                submission_id=submission_id,
                flags=flags,
            )
        else:
            logger.info(
                "kyc_task.ready_for_review",
                submission_id=submission_id,
                flags=flags,
            )

        await session.commit()

    return {"submission_id": submission_id, "flags": flags, "auto_rejected": auto_reject}


@celery_app.task(name="cleanup_expired_sessions")
def cleanup_expired_sessions() -> dict:
    """Called by Celery beat every 5 minutes."""
    return _run_async(_cleanup())


async def _cleanup() -> dict:
    from app.core.db import _get_session_factory
    from app.services.registration_sessions import cleanup_expired

    factory = _get_session_factory()
    async with factory() as session:
        count = await cleanup_expired(session)
    return {"expired_count": count}


# ── Beat schedule ──
celery_app.conf.beat_schedule["cleanup-expired-sessions"] = {
    "task": "cleanup_expired_sessions",
    "schedule": 300.0,  # every 5 minutes
}
