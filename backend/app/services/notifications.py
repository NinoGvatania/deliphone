"""Comprehensive notification dispatch system (SPEC §12).

Supports multiple channels: in_app, telegram_bot, push (placeholder).
Rate limiting: max 5 push notifications per client per day.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.ops import Notification
from app.models.users import User
from app.services.telegram_bot import get_telegram_bot

logger = get_logger("notifications")

# ── Event type constants (SPEC §12) ─────────────────────────────────────────

CLIENT_EVENTS = [
    "kyc_submitted",
    "kyc_approved",
    "kyc_rejected",
    "kyc_resubmit_requested",
    "udobno_subscribed",
    "udobno_charged",
    "udobno_cancelled",
    "rental_activated",
    "rental_charge_success",
    "rental_charge_failed",
    "rental_paused",
    "rental_overdue",
    "debt_threshold_1000",
    "debt_threshold_2500",
    "debt_threshold_4500",
    "incident_created",
    "incident_quoted",
    "incident_resolved",
    "return_confirmed",
    "deposit_refunded",
    "support_reply",
]

PARTNER_EVENTS = [
    "client_attached_via_qr",
    "client_ready_for_pickup",
    "client_confirmed_return",
    "return_dispute_opened",
    "inventory_audit_scheduled",
    "commission_accrued",
]

ADMIN_EVENTS = [
    "kyc_queue_growing",
    "incident_critical_created",
    "partner_inventory_missed",
]

# ── Default message templates ────────────────────────────────────────────────

DEFAULT_TEMPLATES: dict[str, dict[str, str]] = {
    "kyc_submitted": {
        "title": "Проверяем документы",
        "body": "Обычно это занимает до 30 минут. Мы пришлём уведомление.",
    },
    "kyc_approved": {
        "title": "Верификация пройдена!",
        "body": "Теперь ты можешь арендовать смартфон. Найди ближайшую точку на карте.",
    },
    "kyc_rejected": {
        "title": "Верификация не пройдена",
        "body": "Причина: {reason}. Ты можешь подать заявку заново.",
    },
    "kyc_resubmit_requested": {
        "title": "Нужно переснять документы",
        "body": "Переснимите: {files}.\n{comment}",
    },
    "udobno_subscribed": {
        "title": "Подписка «Удобно» оформлена",
        "body": "Залог снижен на 50%. Следующее списание через 30 дней.",
    },
    "udobno_charged": {
        "title": "Списание за подписку «Удобно»",
        "body": "Списали 199 ₽. Следующее списание через 30 дней.",
    },
    "udobno_cancelled": {
        "title": "Подписка «Удобно» отменена",
        "body": "Подписка действует до {ends_at}. После этого залог вернётся к стандартному.",
    },
    "rental_activated": {
        "title": "Аренда активирована",
        "body": "Смартфон у тебя! Первые сутки оплачены до {paid_until}.",
    },
    "rental_charge_success": {
        "title": "Списание за аренду",
        "body": "Списали 349 ₽. Оплачено до {paid_until}.",
    },
    "rental_charge_failed": {
        "title": "Не удалось списать за аренду",
        "body": "Проверь карту — попробуем ещё раз через 6 часов.",
    },
    "rental_paused": {
        "title": "Аренда приостановлена",
        "body": "Не удалось списать оплату. Пополни карту.",
    },
    "rental_overdue": {
        "title": "Просрочка по аренде",
        "body": "Оплата не прошла после нескольких попыток. Начисляется долг.",
    },
    "debt_threshold_1000": {
        "title": "Задолженность: {amount} ₽",
        "body": "Пополни карту — автосписание пройдёт при следующей попытке.",
    },
    "debt_threshold_2500": {
        "title": "Долг за аренду: {amount} ₽",
        "body": "Пополни карту, чтобы избежать блокировки.",
    },
    "debt_threshold_4500": {
        "title": "Устройство объявлено утраченным",
        "body": "Долг достиг 4500 ₽. Залог будет удержан полностью.",
    },
    "incident_created": {
        "title": "Инцидент зарегистрирован",
        "body": "Мы рассмотрим обращение в ближайшее время.",
    },
    "incident_quoted": {
        "title": "Оценка по инциденту",
        "body": "Сумма к оплате: {amount} ₽. Прими или оспорь в приложении.",
    },
    "incident_resolved": {
        "title": "Инцидент закрыт",
        "body": "Решение: {resolution}.",
    },
    "return_confirmed": {
        "title": "Возврат подтверждён",
        "body": "Смартфон принят. Залог будет возвращён в течение суток.",
    },
    "deposit_refunded": {
        "title": "Залог возвращён",
        "body": "Сумма {amount} ₽ вернётся на карту в течение 3 рабочих дней.",
    },
    "support_reply": {
        "title": "Ответ поддержки",
        "body": "Тебе ответили в чате поддержки.",
    },
    # Partner events
    "client_attached_via_qr": {
        "title": "Клиент привязан",
        "body": "Клиент отсканировал QR и привязался к точке.",
    },
    "client_ready_for_pickup": {
        "title": "Клиент готов к выдаче",
        "body": "Верификация пройдена, можно выдавать устройство.",
    },
    "client_confirmed_return": {
        "title": "Клиент вернул устройство",
        "body": "Подтвердите приём устройства в приложении.",
    },
    "return_dispute_opened": {
        "title": "Спор при возврате",
        "body": "Клиент оспорил состояние устройства при возврате.",
    },
    "inventory_audit_scheduled": {
        "title": "Запланирована инвентаризация",
        "body": "Проверка запланирована на {scheduled_at}.",
    },
    "commission_accrued": {
        "title": "Начислена комиссия",
        "body": "За последний период начислено {amount} ₽.",
    },
    # Admin events
    "kyc_queue_growing": {
        "title": "Очередь KYC растёт",
        "body": "В очереди на проверку более 10 заявок.",
    },
    "incident_critical_created": {
        "title": "Критический инцидент",
        "body": "Создан инцидент с критической severity: {description}.",
    },
    "partner_inventory_missed": {
        "title": "Пропущена инвентаризация",
        "body": "Партнёр не провёл запланированную инвентаризацию.",
    },
}

DAILY_PUSH_LIMIT = 5


class NotificationService:
    """Central notification dispatcher."""

    async def send(
        self,
        session: AsyncSession,
        recipient_type: str,
        recipient_id: uuid.UUID,
        event_type: str,
        title: str,
        body: str,
        channels: list[str] | None = None,
        extra: dict | None = None,
    ) -> None:
        """Dispatch notification through specified channels.

        Args:
            session: DB session.
            recipient_type: "user", "partner_user", or "admin_user".
            recipient_id: UUID of the recipient.
            event_type: One of CLIENT_EVENTS, PARTNER_EVENTS, or ADMIN_EVENTS.
            title: Notification title.
            body: Notification body text.
            channels: List of channels. Defaults to ["in_app", "telegram_bot"].
            extra: Additional data (e.g. telegram_id for TG dispatch).
        """
        if channels is None:
            channels = ["in_app", "telegram_bot"]

        for channel in channels:
            if channel == "in_app":
                await self._send_in_app(session, recipient_type, recipient_id, event_type, title, body)
            elif channel == "telegram_bot":
                telegram_id = (extra or {}).get("telegram_id")
                await self._send_telegram(session, recipient_type, recipient_id, event_type, title, body, telegram_id)
            elif channel == "push":
                await self._send_push(session, recipient_type, recipient_id, event_type, title, body)

    async def _send_in_app(
        self,
        session: AsyncSession,
        recipient_type: str,
        recipient_id: uuid.UUID,
        event_type: str,
        title: str,
        body: str,
    ) -> None:
        """Save notification to the notifications table."""
        notif = Notification(
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            channel="in_app",
            event_type=event_type,
            content={"title": title, "body": body},
            status="delivered",
            sent_at=datetime.now(UTC),
        )
        session.add(notif)

    async def _send_telegram(
        self,
        session: AsyncSession,
        recipient_type: str,
        recipient_id: uuid.UUID,
        event_type: str,
        title: str,
        body: str,
        telegram_id: int | None = None,
    ) -> None:
        """Send via Telegram bot and persist record."""
        notif = Notification(
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            channel="telegram",
            event_type=event_type,
            content={"title": title, "body": body},
            status="sent",
            sent_at=datetime.now(UTC),
        )
        session.add(notif)

        if telegram_id is None:
            notif.status = "skipped"
            logger.info("tg_notify.no_telegram_id", recipient_id=str(recipient_id))
            return

        bot = get_telegram_bot()
        try:
            await bot.send_message(telegram_id, f"<b>{title}</b>\n{body}")
        except Exception as exc:
            logger.warning("tg_notify.failed", recipient_id=str(recipient_id), error=str(exc))
            notif.status = "failed"

    async def _send_push(
        self,
        session: AsyncSession,
        recipient_type: str,
        recipient_id: uuid.UUID,
        event_type: str,
        title: str,
        body: str,
    ) -> None:
        """Send push notification (placeholder — VAPID not yet wired)."""
        # Rate limit: max 5 push per client per day
        if recipient_type == "user":
            today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
            count_result = await session.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.recipient_id == recipient_id,
                    Notification.channel == "push",
                    Notification.sent_at >= today_start,
                )
            )
            count = count_result.scalar() or 0
            if count >= DAILY_PUSH_LIMIT:
                logger.info("push.rate_limited", recipient_id=str(recipient_id), count=count)
                return

        notif = Notification(
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            channel="push",
            event_type=event_type,
            content={"title": title, "body": body},
            status="pending",
            sent_at=datetime.now(UTC),
        )
        session.add(notif)
        # Placeholder: actual VAPID push will be implemented when keys are configured
        logger.info("push.placeholder", event_type=event_type, recipient_id=str(recipient_id))


# Singleton instance
_service: NotificationService | None = None


def get_notification_service() -> NotificationService:
    global _service
    if _service is None:
        _service = NotificationService()
    return _service


# ── Backward-compatible helpers (used by existing KYC code) ──────────────────


async def send_kyc_notification(
    session: AsyncSession,
    user: User,
    event_type: str,
    title: str,
    body: str,
) -> None:
    """Persist notification + send via Telegram bot. Backward-compat wrapper."""
    svc = get_notification_service()
    await svc.send(
        session,
        recipient_type="user",
        recipient_id=user.id,
        event_type=event_type,
        title=title,
        body=body,
        channels=["in_app"],
    )


async def notify_kyc_submitted(session: AsyncSession, user: User) -> None:
    tpl = DEFAULT_TEMPLATES["kyc_submitted"]
    await send_kyc_notification(session, user, "kyc_submitted", tpl["title"], tpl["body"])


async def notify_kyc_approved(session: AsyncSession, user: User) -> None:
    tpl = DEFAULT_TEMPLATES["kyc_approved"]
    await send_kyc_notification(session, user, "kyc_approved", tpl["title"], tpl["body"])


async def notify_kyc_rejected(session: AsyncSession, user: User, reason: str) -> None:
    tpl = DEFAULT_TEMPLATES["kyc_rejected"]
    await send_kyc_notification(
        session, user, "kyc_rejected",
        tpl["title"], tpl["body"].format(reason=reason),
    )


async def notify_kyc_resubmit_requested(
    session: AsyncSession, user: User, files: list[str], comment: str
) -> None:
    tpl = DEFAULT_TEMPLATES["kyc_resubmit_requested"]
    files_str = ", ".join(files)
    await send_kyc_notification(
        session, user, "kyc_resubmit_requested",
        tpl["title"], tpl["body"].format(files=files_str, comment=comment),
    )
