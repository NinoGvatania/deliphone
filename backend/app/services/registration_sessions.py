"""Partner registration session management.

Flow (Telegram-only, no SMS):
1. Partner creates session → gets QR with ?reg={session_id}
2. Client scans QR, authenticates via Telegram Login Widget
3. Client auth endpoint attaches user to session (already done in auth.py)
4. Partner polls status until attached → proceeds with KYC
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.partners import PartnerUser, RegistrationSession

logger = get_logger("registration_sessions")

SESSION_TTL_MINUTES = 15


async def create_session(
    session: AsyncSession,
    partner_user: PartnerUser,
) -> RegistrationSession:
    """Create a new pending registration session for the partner's location."""
    from app.models.partners import PartnerLocation

    loc_result = await session.execute(
        select(PartnerLocation).where(
            PartnerLocation.partner_id == partner_user.partner_id,
        )
    )
    location = loc_result.scalars().first()
    if not location:
        raise ValueError("partner has no locations")

    reg = RegistrationSession(
        partner_id=partner_user.partner_id,
        partner_user_id=partner_user.id,
        location_id=location.id,
        status="pending",
        expires_at=datetime.now(UTC) + timedelta(minutes=SESSION_TTL_MINUTES),
    )
    session.add(reg)
    await session.flush()
    return reg


def build_qr_url(session_id: uuid.UUID) -> str:
    """URL that the client scans — opens Telegram Login Widget with reg param."""
    base = f"https://app.deliphone.ru"
    return f"{base}/auth?reg={session_id}"


def build_deep_link(session_id: uuid.UUID) -> str:
    """Telegram deep link for bots: starts the bot with reg session context."""
    return f"https://t.me/{settings.TG_BOT_USERNAME}?start=reg_{session_id}"


async def get_session_status(
    session: AsyncSession,
    session_id: uuid.UUID,
) -> RegistrationSession | None:
    result = await session.execute(
        select(RegistrationSession).where(RegistrationSession.id == session_id)
    )
    return result.scalars().first()


async def cleanup_expired(session: AsyncSession) -> int:
    """Mark expired pending sessions. Called by Celery beat every 5 min."""
    now = datetime.now(UTC)
    result = await session.execute(
        update(RegistrationSession)
        .where(
            RegistrationSession.status == "pending",
            RegistrationSession.expires_at < now,
        )
        .values(status="expired")
    )
    await session.commit()
    count = result.rowcount  # type: ignore[attr-defined]
    if count:
        logger.info("registration_sessions.cleanup", expired_count=count)
    return count
