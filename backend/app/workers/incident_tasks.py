"""Celery tasks for automated incident lifecycle management (SPEC §10).

Schedule (added to celery_app.conf.beat_schedule):
- auto_escalate_old_incidents: daily — under_review > 5 days -> escalate
- expertise_timeout: daily — malfunction in expertise > 7 days -> auto resolved
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger("incident_tasks")


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="auto_escalate_old_incidents")
def auto_escalate_old_incidents() -> dict:
    """Incidents stuck in under_review > 5 days get escalated to critical."""
    return _run_async(_auto_escalate())


async def _auto_escalate() -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.rentals import Incident

    factory = _get_session_factory()
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=5)
    escalated = 0

    async with factory() as session:
        result = await session.execute(
            select(Incident).where(
                Incident.status == "under_review",
                Incident.created_at <= cutoff,
            )
        )
        incidents = result.scalars().all()

        for incident in incidents:
            incident.severity = "critical"
            incident.status = "escalated"
            escalated += 1

        await session.commit()

    logger.info("auto_escalate.done", escalated=escalated)
    return {"escalated": escalated}


@celery_app.task(name="expertise_timeout")
def expertise_timeout() -> dict:
    """Malfunction incidents in expertise > 7 days -> auto written off for client."""
    return _run_async(_expertise_timeout())


async def _expertise_timeout() -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.rentals import Incident

    factory = _get_session_factory()
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=7)
    resolved = 0

    async with factory() as session:
        result = await session.execute(
            select(Incident).where(
                Incident.type == "malfunction",
                Incident.expertise_required == True,  # noqa: E712
                Incident.expertise_started_at != None,  # noqa: E711
                Incident.expertise_started_at <= cutoff,
                Incident.status.in_(["in_progress", "under_review"]),
            )
        )
        incidents = result.scalars().all()

        for incident in incidents:
            incident.status = "resolved"
            incident.resolution_type = "resolved_written_off"
            incident.resolved_at = now
            incident.expertise_result = "timeout_written_off"
            resolved += 1

        await session.commit()

    logger.info("expertise_timeout.done", resolved=resolved)
    return {"resolved": resolved}


celery_app.conf.beat_schedule.update({
    "auto-escalate-old-incidents": {
        "task": "auto_escalate_old_incidents",
        "schedule": 86400.0,  # daily
    },
    "expertise-timeout": {
        "task": "expertise_timeout",
        "schedule": 86400.0,  # daily
    },
})
