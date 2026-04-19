"""Notification dispatch for KYC and other events.

Saves to the notifications table and dispatches via Telegram bot
(Phase 5 adds Web Push via VAPID).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.ops import Notification
from app.models.users import User
from app.services.telegram_bot import get_telegram_bot

logger = get_logger("notifications")


async def send_kyc_notification(
    session: AsyncSession,
    user: User,
    event_type: str,
    title: str,
    body: str,
) -> None:
    """Persist notification + send via Telegram bot."""
    notif = Notification(
        recipient_type="user",
        recipient_id=user.id,
        channel="telegram",
        event_type=event_type,
        content={"title": title, "body": body},
        status="sent",
        sent_at=datetime.now(UTC),
    )
    session.add(notif)

    bot = get_telegram_bot()
    try:
        await bot.send_message(
            user.telegram_id,
            f"<b>{title}</b>\n{body}",
        )
    except Exception as exc:
        logger.warning("tg_notify.failed", user_id=str(user.id), error=str(exc))
        notif.status = "failed"


async def notify_kyc_submitted(session: AsyncSession, user: User) -> None:
    await send_kyc_notification(
        session, user,
        event_type="kyc_submitted",
        title="Проверяем документы",
        body="Обычно это занимает до 30 минут. Мы пришлём уведомление.",
    )


async def notify_kyc_approved(session: AsyncSession, user: User) -> None:
    await send_kyc_notification(
        session, user,
        event_type="kyc_approved",
        title="Верификация пройдена!",
        body="Теперь ты можешь арендовать смартфон. Найди ближайшую точку на карте.",
    )


async def notify_kyc_rejected(
    session: AsyncSession, user: User, reason: str
) -> None:
    await send_kyc_notification(
        session, user,
        event_type="kyc_rejected",
        title="Верификация не пройдена",
        body=f"Причина: {reason}. Ты можешь подать заявку заново.",
    )


async def notify_kyc_resubmit_requested(
    session: AsyncSession, user: User, files: list[str], comment: str
) -> None:
    files_str = ", ".join(files)
    await send_kyc_notification(
        session, user,
        event_type="kyc_resubmit_requested",
        title="Нужно переснять документы",
        body=f"Переснимите: {files_str}.\n{comment}",
    )
