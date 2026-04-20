"""Celery tasks for automated payments, subscription charges, and debt management.

Schedule (added to celery_app.conf.beat_schedule):
- charge_daily_rentals: every 5 min
- charge_subscriptions: every hour
- update_debts: every hour
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger("payment_tasks")


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── Daily rental charges ────────────────────────────────────────────────────

@celery_app.task(name="charge_daily_rentals", bind=True)
def charge_daily_rentals(self) -> dict:
    """Find active rentals past next_charge_at and bill 349 ₽."""
    return _run_async(_charge_daily())


async def _charge_daily() -> dict:
    import redis.asyncio as aioredis
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.db import _get_session_factory
    from app.models.rentals import Payment, Rental
    from app.models.users import PaymentMethod, User
    from app.services.receipts import build_receipt

    factory = _get_session_factory()
    redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    now = datetime.now(UTC)
    charged = 0
    failed = 0

    try:
        async with factory() as session:
            result = await session.execute(
                select(Rental).where(
                    Rental.status == "active",
                    Rental.next_charge_at <= now,
                )
            )
            rentals = result.scalars().all()

            for rental in rentals:
                lock_key = f"charge_lock:{rental.id}"
                if not await redis.set(lock_key, "1", ex=300, nx=True):
                    continue  # another worker is handling this rental

                try:
                    # Find default payment method
                    pm_result = await session.execute(
                        select(PaymentMethod).where(
                            PaymentMethod.user_id == rental.user_id,
                            PaymentMethod.is_default == True,  # noqa: E712
                        )
                    )
                    pm = pm_result.scalars().first()

                    if pm is None or not pm.yookassa_token:
                        rental.status = "paused_payment_failed"
                        failed += 1
                        continue

                    # Create payment record
                    payment = Payment(
                        user_id=rental.user_id,
                        rental_id=rental.id,
                        type="daily_charge",
                        counts_toward_partner_commission=True,
                        amount=Decimal("349.00"),
                        provider="yookassa",
                        provider_status="pending",
                    )
                    session.add(payment)
                    await session.flush()

                    # In real mode, call YookassaClient here:
                    # yookassa = get_yookassa()
                    # result = await yookassa.create_payment(
                    #     amount=Decimal("349.00"), currency="RUB",
                    #     description="Аренда смартфона, сутки",
                    #     payment_method_id=pm.yookassa_token,
                    #     receipt=build_receipt(user, "Аренда смартфона, сутки", Decimal("349.00")),
                    # )
                    # For now, simulate success:
                    payment.provider_status = "succeeded"
                    payment.captured_at = now

                    rental.total_charged = Decimal(str(rental.total_charged)) + Decimal("349.00")
                    rental.paid_until = (rental.paid_until or now) + timedelta(hours=24)
                    rental.next_charge_at = rental.paid_until
                    charged += 1

                except Exception as exc:
                    logger.error("charge_daily.error", rental_id=str(rental.id), error=str(exc))
                    rental.status = "paused_payment_failed"
                    failed += 1
                finally:
                    await redis.delete(lock_key)

            await session.commit()
    finally:
        await redis.aclose()

    logger.info("charge_daily.done", charged=charged, failed=failed)
    return {"charged": charged, "failed": failed}


# ── Subscription charges ────────────────────────────────────────────────────

@celery_app.task(name="charge_subscriptions", bind=True)
def charge_subscriptions(self) -> dict:
    """Charge 199 ₽ for active Удобно subscriptions past next_charge_at."""
    return _run_async(_charge_subs())


async def _charge_subs() -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.rentals import Payment
    from app.models.users import PaymentMethod, Subscription, User

    factory = _get_session_factory()
    now = datetime.now(UTC)
    charged = 0
    failed = 0

    async with factory() as session:
        result = await session.execute(
            select(Subscription).where(
                Subscription.status == "active",
                Subscription.next_charge_at <= now,
            )
        )
        subs = result.scalars().all()

        for sub in subs:
            pm_result = await session.execute(
                select(PaymentMethod).where(
                    PaymentMethod.user_id == sub.user_id,
                    PaymentMethod.is_default == True,  # noqa: E712
                )
            )
            pm = pm_result.scalars().first()

            if pm is None or not pm.yookassa_token:
                sub.payment_failures_count += 1
                if sub.payment_failures_count >= 3:
                    sub.status = "payment_failed"
                failed += 1
                continue

            payment = Payment(
                user_id=sub.user_id,
                subscription_id=sub.id,
                type="subscription_charge",
                counts_toward_partner_commission=False,
                amount=Decimal("199.00"),
                provider="yookassa",
                provider_status="succeeded",
                captured_at=now,
            )
            session.add(payment)

            sub.total_paid = Decimal(str(sub.total_paid)) + Decimal("199.00")
            sub.next_charge_at = now + timedelta(days=30)
            sub.payment_failures_count = 0
            charged += 1

        await session.commit()

    logger.info("charge_subs.done", charged=charged, failed=failed)
    return {"charged": charged, "failed": failed}


# ── Retry failed payments ───────────────────────────────────────────────────

@celery_app.task(name="retry_failed_payment", bind=True, max_retries=3)
def retry_failed_payment(self, rental_id: str) -> dict:
    """Retry schedule: 6h → 12h → 24h. All fail → overdue."""
    return _run_async(_retry(rental_id, self.request.retries))


async def _retry(rental_id: str, attempt: int) -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.rentals import Rental

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(Rental).where(Rental.id == rental_id)
        )
        rental = result.scalars().first()
        if not rental or rental.status != "paused_payment_failed":
            return {"skipped": True}

        # In real impl: try charging again
        # For now: simulate continued failure → move to overdue after 3 retries
        if attempt >= 2:
            rental.status = "overdue"
            logger.info("retry.exhausted", rental_id=rental_id)
        else:
            logger.info("retry.scheduled", rental_id=rental_id, attempt=attempt)

        await session.commit()

    return {"rental_id": rental_id, "attempt": attempt}


# ── Debt accumulation ───────────────────────────────────────────────────────

@celery_app.task(name="update_debts")
def update_debts() -> dict:
    """Track debt for overdue rentals, trigger notifications at thresholds."""
    return _run_async(_update_debts())


async def _update_debts() -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.models.finance import Debt
    from app.models.ops import SupportChat
    from app.models.rentals import Incident, Payment, Rental
    from app.models.users import User
    from app.services.notifications import get_notification_service

    factory = _get_session_factory()
    now = datetime.now(UTC)
    svc = get_notification_service()

    async with factory() as session:
        result = await session.execute(
            select(Rental).where(Rental.status == "overdue")
        )
        rentals = result.scalars().all()
        updates = 0

        for rental in rentals:
            if not rental.paid_until:
                continue

            # Calculate unpaid days since paid_until
            unpaid_seconds = (now - rental.paid_until).total_seconds()
            unpaid_days = max(0, unpaid_seconds / 86400)
            new_debt = Decimal(str(round(unpaid_days * 349, 2)))

            old_debt = Decimal(str(rental.debt_amount))
            if new_debt <= old_debt:
                continue

            rental.debt_amount = float(new_debt)
            updates += 1

            user_result = await session.execute(
                select(User).where(User.id == rental.user_id)
            )
            user = user_result.scalars().first()
            if not user:
                continue

            # Threshold notifications (SPEC §9.7)
            if new_debt >= 4500 and old_debt < 4500:
                # "Потеряшка" — device considered lost
                rental.status = "closed_incident"

                # Capture deposit
                deposit_amount = Decimal(str(rental.deposit_amount or 0))
                if deposit_amount > 0:
                    deposit_payment = Payment(
                        user_id=rental.user_id,
                        rental_id=rental.id,
                        type="deposit_capture",
                        counts_toward_partner_commission=False,
                        amount=deposit_amount,
                        provider="yookassa",
                        provider_status="succeeded",
                        captured_at=now,
                    )
                    session.add(deposit_payment)

                # If debt exceeds deposit, create Debt record for the difference
                if new_debt > deposit_amount:
                    remainder = new_debt - deposit_amount
                    debt_record = Debt(
                        user_id=rental.user_id,
                        origin_type="rental",
                        origin_id=rental.id,
                        amount=float(remainder),
                        status="active",
                    )
                    session.add(debt_record)

                # Create loss incident
                incident = Incident(
                    rental_id=rental.id,
                    device_id=rental.device_id,
                    user_id=rental.user_id,
                    type="loss",
                    severity="critical",
                    status="open",
                    reported_by="system",
                    description="Устройство объявлено утраченным",
                )
                session.add(incident)

                # Mark device as missing
                device_result = await session.execute(
                    select(Device).where(Device.id == rental.device_id)
                )
                device = device_result.scalars().first()
                if device:
                    device.current_custody = "missing"

                # Notify client
                await svc.send(
                    session,
                    recipient_type="user",
                    recipient_id=user.id,
                    event_type="debt_threshold_4500",
                    title="Устройство объявлено утраченным",
                    body="Долг достиг 4500 ₽. Залог будет удержан полностью.",
                    channels=["in_app"],
                )

                # Notify admin about critical incident
                await svc.send(
                    session,
                    recipient_type="admin_user",
                    recipient_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                    event_type="incident_critical_created",
                    title="Критический инцидент",
                    body=f"Потеряшка: пользователь {user.phone_number}, долг {new_debt} ₽.",
                    channels=["in_app"],
                )

            elif new_debt >= 2500 and old_debt < 2500:
                # Create support chat for debt management
                chat = SupportChat(
                    user_id=rental.user_id,
                    rental_id=rental.id,
                    subject="Долг клиента превысил 2500 ₽",
                    status="open",
                    priority="high",
                )
                session.add(chat)

                await svc.send(
                    session,
                    recipient_type="user",
                    recipient_id=user.id,
                    event_type="debt_threshold_2500",
                    title="Долг за аренду: {:.0f} ₽".format(new_debt),
                    body="Пополни карту, чтобы избежать блокировки.",
                    channels=["in_app"],
                )

            elif new_debt >= 1000 and old_debt < 1000:
                await svc.send(
                    session,
                    recipient_type="user",
                    recipient_id=user.id,
                    event_type="debt_threshold_1000",
                    title="Задолженность: {:.0f} ₽".format(new_debt),
                    body="Пополни карту — автосписание пройдёт при следующей попытке.",
                    channels=["in_app"],
                )

        await session.commit()

    logger.info("update_debts.done", updates=updates)
    return {"updates": updates}


# ── Beat schedule additions ─────────────────────────────────────────────────

celery_app.conf.beat_schedule.update({
    "charge-daily-rentals": {
        "task": "charge_daily_rentals",
        "schedule": 300.0,  # every 5 minutes
    },
    "charge-subscriptions": {
        "task": "charge_subscriptions",
        "schedule": 3600.0,  # every hour
    },
    "update-debts": {
        "task": "update_debts",
        "schedule": 3600.0,  # every hour
    },
})
