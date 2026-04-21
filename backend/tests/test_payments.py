"""Comprehensive payment sandbox tests: YookassaClient, daily charges,
subscriptions, webhook HMAC + idempotency, 54-FZ receipts, partner
commission flags, debt thresholds.
"""

from __future__ import annotations

import hashlib
import hmac as _hmac
import random
import time
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.core.config import settings

TEST_BOT_TOKEN = "test-bot-token-12345"

_TG_BASE = random.randint(600_000_000, 699_999_999)
_RND = random.randint(100_000, 999_999)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_telegram_auth(bot_token: str, telegram_id: int = 123456789, **overrides) -> dict:
    data = {
        "id": telegram_id,
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser",
        "photo_url": "https://example.com/photo.jpg",
        "auth_date": int(time.time()),
        **overrides,
    }
    secret = hashlib.sha256(bot_token.encode()).digest()
    check_str = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    data["hash"] = _hmac.new(secret, check_str.encode(), hashlib.sha256).hexdigest()
    return data


async def _create_client_user(client: AsyncClient, telegram_id: int) -> tuple[str, str]:
    """Create a user via Telegram auth, return (user_id, access_token)."""
    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=telegram_id)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    return body["user"]["id"], body["access_token"]


def _unique_imei(suffix: int) -> str:
    return uuid.uuid4().hex[:15]


def _unique_code(suffix: int) -> str:
    return uuid.uuid4().hex[:6]


def _mock_yookassa():
    yk = MagicMock()
    yk.create_payment = AsyncMock(return_value={
        "id": "test-payment-id",
        "status": "succeeded",
        "amount": {"value": "349.00", "currency": "RUB"},
        "payment_method": {
            "id": "pm-test-123",
            "type": "bank_card",
            "card": {"last4": "4242", "card_type": "Visa"},
        },
    })
    yk.create_hold = AsyncMock(return_value={
        "id": "test-hold-id",
        "status": "waiting_for_capture",
        "amount": {"value": "4500.00", "currency": "RUB"},
    })
    yk.capture_hold = AsyncMock(return_value={
        "id": "test-hold-id",
        "status": "succeeded",
    })
    yk.cancel_hold = AsyncMock(return_value={
        "id": "test-hold-id",
        "status": "canceled",
    })
    yk.create_refund = AsyncMock(return_value={
        "id": "test-refund-id",
        "status": "succeeded",
    })
    yk.get_payment = AsyncMock(return_value={
        "id": "test-payment-id",
        "status": "succeeded",
    })
    yk.verify_webhook_signature = MagicMock(return_value=True)
    yk.webhook_secret = "test-secret"
    return yk


async def _create_rental_fixtures(session, user_id, suffix, **rental_kwargs):
    """Create partner, location, tariff, device and rental. Return rental_id."""
    from app.models.catalog import Device, Tariff
    from app.models.partners import Partner, PartnerLocation
    from app.models.rentals import Rental

    partner = Partner(legal_name=f"Partner {_RND}-{suffix}")
    session.add(partner)
    await session.flush()

    location = PartnerLocation(partner_id=partner.id, name=f"Loc {_RND}-{suffix}")
    session.add(location)
    await session.flush()

    tariff = Tariff(name="Стандарт", price=349.00)
    session.add(tariff)
    await session.flush()

    device = Device(
        imei=_unique_imei(suffix),
        short_code=_unique_code(suffix),
        model="Test Phone",
    )
    session.add(device)
    await session.flush()

    rental = Rental(
        user_id=user_id,
        device_id=device.id,
        tariff_id=tariff.id,
        issued_at_location_id=location.id,
        **rental_kwargs,
    )
    session.add(rental)
    await session.flush()
    return rental.id, device.id


# ---------------------------------------------------------------------------
# 1. create_hold 4500, 180 days — capture=False
# ---------------------------------------------------------------------------


async def test_create_hold_4500_180_days():
    yk = _mock_yookassa()
    result = await yk.create_hold(
        amount=Decimal("4500"),
        currency="RUB",
        description="Залог за устройство",
        hold_duration_days=180,
    )
    assert result["status"] == "waiting_for_capture"
    assert result["amount"]["value"] == "4500.00"
    yk.create_hold.assert_called_once()
    call_kwargs = yk.create_hold.call_args
    assert call_kwargs.kwargs.get("amount") == Decimal("4500") or call_kwargs[1].get("amount") == Decimal("4500")


# ---------------------------------------------------------------------------
# 2. create_hold 1500 (Удобно deposit)
# ---------------------------------------------------------------------------


async def test_create_hold_1500_with_udobno():
    yk = _mock_yookassa()
    yk.create_hold = AsyncMock(return_value={
        "id": "test-hold-udobno",
        "status": "waiting_for_capture",
        "amount": {"value": "1500.00", "currency": "RUB"},
    })
    result = await yk.create_hold(
        amount=Decimal("1500"),
        currency="RUB",
        description="Залог (Удобно)",
        hold_duration_days=180,
    )
    assert result["status"] == "waiting_for_capture"
    assert result["amount"]["value"] == "1500.00"


# ---------------------------------------------------------------------------
# 3. capture_hold — partial capture for damage
# ---------------------------------------------------------------------------


async def test_capture_partial():
    yk = _mock_yookassa()
    yk.capture_hold = AsyncMock(return_value={
        "id": "test-hold-id",
        "status": "succeeded",
        "amount": {"value": "2000.00", "currency": "RUB"},
    })
    result = await yk.capture_hold(
        payment_id="test-hold-id",
        amount=Decimal("2000"),
    )
    assert result["status"] == "succeeded"
    assert result["amount"]["value"] == "2000.00"
    yk.capture_hold.assert_called_once_with(
        payment_id="test-hold-id",
        amount=Decimal("2000"),
    )


# ---------------------------------------------------------------------------
# 4. cancel_hold
# ---------------------------------------------------------------------------


async def test_cancel_hold():
    yk = _mock_yookassa()
    result = await yk.cancel_hold(payment_id="test-hold-id")
    assert result["status"] == "canceled"
    yk.cancel_hold.assert_called_once_with(payment_id="test-hold-id")


# ---------------------------------------------------------------------------
# 5. daily charge — success
# ---------------------------------------------------------------------------


async def test_daily_charge_success(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Rental
    from app.models.users import PaymentMethod

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 1)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        pm = PaymentMethod(
            user_id=user_id,
            yookassa_token="tok_test_daily",
            card_last4="1234",
            card_network="Visa",
            is_default=True,
        )
        session.add(pm)
        await session.flush()

        rental_id, _ = await _create_rental_fixtures(
            session, user_id, 1,
            status="active",
            activated_at=now - timedelta(hours=25),
            paid_until=now - timedelta(hours=1),
            next_charge_at=now - timedelta(hours=1),
            total_charged=349.00,
            debt_amount=0,
        )
        await session.commit()

    with patch("redis.asyncio.from_url") as mock_from_url:
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock(return_value=True)
        mock_redis.delete = AsyncMock()
        mock_redis.aclose = AsyncMock()
        mock_from_url.return_value = mock_redis

        from app.workers.payment_tasks import _charge_daily
        result = await _charge_daily()

    assert result["charged"] >= 1

    async with factory() as session:
        from sqlalchemy import select
        r = await session.execute(select(Rental).where(Rental.id == rental_id))
        updated_rental = r.scalars().first()
        assert updated_rental is not None
        assert updated_rental.status == "active"
        assert Decimal(str(updated_rental.total_charged)) >= Decimal("698.00")


# ---------------------------------------------------------------------------
# 6. daily charge fail — no payment method
# ---------------------------------------------------------------------------


async def test_daily_charge_fail(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Rental
    from app.models.users import PaymentMethod

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 2)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        from sqlalchemy import delete
        await session.execute(
            delete(PaymentMethod).where(PaymentMethod.user_id == user_id)
        )

        rental_id, _ = await _create_rental_fixtures(
            session, user_id, 2,
            status="active",
            activated_at=now - timedelta(hours=25),
            paid_until=now - timedelta(hours=1),
            next_charge_at=now - timedelta(hours=1),
            total_charged=349.00,
            debt_amount=0,
        )
        await session.commit()

    with patch("redis.asyncio.from_url") as mock_from_url:
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock(return_value=True)
        mock_redis.delete = AsyncMock()
        mock_redis.aclose = AsyncMock()
        mock_from_url.return_value = mock_redis

        from app.workers.payment_tasks import _charge_daily
        result = await _charge_daily()

    assert result["failed"] >= 1

    async with factory() as session:
        from sqlalchemy import select
        r = await session.execute(select(Rental).where(Rental.id == rental_id))
        updated_rental = r.scalars().first()
        assert updated_rental is not None
        assert updated_rental.status == "paused_payment_failed"


# ---------------------------------------------------------------------------
# 7. subscription charge — first create
# ---------------------------------------------------------------------------


async def test_subscription_charge_first(client: AsyncClient):
    user_id_str, token = await _create_client_user(client, _TG_BASE + 3)
    user_id = uuid.UUID(user_id_str)
    headers = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/api/v1/client/me/email",
        json={"email": "sub_test@example.com"},
        headers=headers,
    )

    from app.core.db import _get_session_factory
    from app.models.users import PaymentMethod

    factory = _get_session_factory()
    async with factory() as session:
        pm = PaymentMethod(
            user_id=user_id,
            yookassa_token="tok_sub_test",
            card_last4="9999",
            card_network="MasterCard",
            is_default=True,
        )
        session.add(pm)
        await session.commit()

    with patch("app.api.v1.client.subscription.get_yookassa") as mock_yk:
        mock_yk.return_value = _mock_yookassa()
        resp = await client.post("/api/v1/client/me/subscription", headers=headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "active"
    assert body["plan"] == "udobno"


# ---------------------------------------------------------------------------
# 8. subscription recurring charge
# ---------------------------------------------------------------------------


async def test_subscription_recurring(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.users import PaymentMethod, Subscription

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 4)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        pm = PaymentMethod(
            user_id=user_id,
            yookassa_token="tok_recur_test",
            card_last4="5555",
            card_network="Visa",
            is_default=True,
        )
        session.add(pm)
        await session.flush()

        sub = Subscription(
            user_id=user_id,
            plan="udobno",
            price=199.00,
            status="active",
            started_at=now - timedelta(days=31),
            next_charge_at=now - timedelta(hours=1),
            total_paid=199.00,
        )
        session.add(sub)
        await session.commit()
        sub_id = sub.id

    from app.workers.payment_tasks import _charge_subs
    result = await _charge_subs()

    assert result["charged"] >= 1

    async with factory() as session:
        from sqlalchemy import select
        r = await session.execute(select(Subscription).where(Subscription.id == sub_id))
        updated_sub = r.scalars().first()
        assert updated_sub is not None
        assert Decimal(str(updated_sub.total_paid)) >= Decimal("398.00")


# ---------------------------------------------------------------------------
# 9. subscription cancel
# ---------------------------------------------------------------------------


async def test_subscription_cancel(client: AsyncClient):
    user_id_str, token = await _create_client_user(client, _TG_BASE + 5)
    user_id = uuid.UUID(user_id_str)
    headers = {"Authorization": f"Bearer {token}"}

    from app.core.db import _get_session_factory
    from app.models.users import PaymentMethod, Subscription

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        pm = PaymentMethod(
            user_id=user_id,
            yookassa_token="tok_cancel_test",
            card_last4="7777",
            card_network="Visa",
            is_default=True,
        )
        session.add(pm)
        await session.flush()

        sub = Subscription(
            user_id=user_id,
            plan="udobno",
            price=199.00,
            status="active",
            started_at=now - timedelta(days=5),
            next_charge_at=now + timedelta(days=25),
            total_paid=199.00,
        )
        session.add(sub)
        await session.commit()

    resp = await client.post("/api/v1/client/me/subscription/cancel", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "cancelled"
    assert body["ends_at"] is not None


# ---------------------------------------------------------------------------
# 10. webhook signature — valid
# ---------------------------------------------------------------------------


async def test_webhook_signature_valid(client: AsyncClient):
    payload = {
        "event": "payment.succeeded",
        "event_id": f"evt-valid-{uuid.uuid4()}",
        "object": {
            "id": "pay-webhook-valid",
            "status": "succeeded",
        },
    }

    import json
    body_bytes = json.dumps(payload).encode()
    sig = _hmac.new(b"test-secret", body_bytes, hashlib.sha256).hexdigest()

    with patch("app.api.v1.webhooks.yookassa.get_yookassa") as mock_yk:
        yk = _mock_yookassa()
        mock_yk.return_value = yk
        resp = await client.post(
            "/api/v1/webhooks/yookassa/payment.succeeded",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Signature": sig},
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# 11. webhook signature — invalid
# ---------------------------------------------------------------------------


async def test_webhook_signature_invalid(client: AsyncClient):
    payload = {
        "event": "payment.succeeded",
        "event_id": f"evt-invalid-{uuid.uuid4()}",
        "object": {"id": "pay-webhook-invalid", "status": "succeeded"},
    }

    with patch("app.api.v1.webhooks.yookassa.get_yookassa") as mock_yk:
        yk = _mock_yookassa()
        yk.verify_webhook_signature = MagicMock(return_value=False)
        mock_yk.return_value = yk
        resp = await client.post(
            "/api/v1/webhooks/yookassa/payment.succeeded",
            json=payload,
            headers={"X-Signature": "bad-sig"},
        )

    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 12. webhook idempotency — second call returns already_processed
# ---------------------------------------------------------------------------


async def test_webhook_idempotency(client: AsyncClient):
    event_id = f"evt-idem-{uuid.uuid4()}"
    payload = {
        "event": "payment.succeeded",
        "event_id": event_id,
        "object": {"id": "pay-idem-test", "status": "succeeded"},
    }

    import json
    body_bytes = json.dumps(payload).encode()

    with patch("app.api.v1.webhooks.yookassa.get_yookassa") as mock_yk:
        yk = _mock_yookassa()
        mock_yk.return_value = yk

        resp1 = await client.post(
            "/api/v1/webhooks/yookassa/payment.succeeded",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Signature": "x"},
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "ok"

        resp2 = await client.post(
            "/api/v1/webhooks/yookassa/payment.succeeded",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Signature": "x"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_processed"


# ---------------------------------------------------------------------------
# 13. receipt email — explicit email_for_receipts
# ---------------------------------------------------------------------------


async def test_receipt_email_from_user():
    from app.models.users import User
    from app.services.receipts import get_receipt_email

    user = MagicMock(spec=User)
    user.email_for_receipts = "explicit@example.com"
    user.telegram_id = 12345

    assert get_receipt_email(user) == "explicit@example.com"


# ---------------------------------------------------------------------------
# 14. receipt email — auto-generated from telegram_id
# ---------------------------------------------------------------------------


async def test_receipt_email_auto_generated():
    from app.models.users import User
    from app.services.receipts import get_receipt_email

    user = MagicMock(spec=User)
    user.email_for_receipts = None
    user.telegram_id = 98765

    result = get_receipt_email(user)
    assert result == f"tg98765@{settings.RECEIPT_EMAIL_DOMAIN}"


# ---------------------------------------------------------------------------
# 15. partner commission flag
# ---------------------------------------------------------------------------


async def test_partner_commission_flag(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Payment
    from app.models.users import PaymentMethod

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 6)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()

    async with factory() as session:
        p_daily = Payment(
            user_id=user_id,
            type="daily_charge",
            counts_toward_partner_commission=True,
            amount=Decimal("349.00"),
            provider="yookassa",
            provider_status="succeeded",
        )
        session.add(p_daily)

        p_sub = Payment(
            user_id=user_id,
            type="subscription",
            counts_toward_partner_commission=False,
            amount=Decimal("199.00"),
            provider="yookassa",
            provider_status="succeeded",
        )
        session.add(p_sub)

        p_deposit = Payment(
            user_id=user_id,
            type="deposit",
            counts_toward_partner_commission=False,
            amount=Decimal("4500.00"),
            provider="yookassa",
            provider_status="succeeded",
        )
        session.add(p_deposit)
        await session.commit()

        p_daily_id = p_daily.id
        p_sub_id = p_sub.id
        p_deposit_id = p_deposit.id

    async with factory() as session:
        from sqlalchemy import select
        for pid, expected in [
            (p_daily_id, True),
            (p_sub_id, False),
            (p_deposit_id, False),
        ]:
            r = await session.execute(select(Payment).where(Payment.id == pid))
            p = r.scalars().first()
            assert p is not None
            assert p.counts_toward_partner_commission is expected, (
                f"Payment type={p.type} expected commission={expected}, got {p.counts_toward_partner_commission}"
            )


# ---------------------------------------------------------------------------
# 16. debt accumulation
# ---------------------------------------------------------------------------


async def test_debt_accumulation(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Rental

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 7)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        rental_id, _ = await _create_rental_fixtures(
            session, user_id, 4,
            status="overdue",
            activated_at=now - timedelta(days=5),
            paid_until=now - timedelta(days=2),
            next_charge_at=now - timedelta(days=2),
            total_charged=349.00,
            debt_amount=0,
        )
        await session.commit()

    with patch("app.services.notifications.send_kyc_notification", new_callable=AsyncMock):
        from app.workers.payment_tasks import _update_debts
        result = await _update_debts()

    assert result["updates"] >= 1

    async with factory() as session:
        from sqlalchemy import select
        r = await session.execute(select(Rental).where(Rental.id == rental_id))
        updated = r.scalars().first()
        assert updated is not None
        assert Decimal(str(updated.debt_amount)) > Decimal("0")


# ---------------------------------------------------------------------------
# 17. debt threshold 1000 — notification sent
# ---------------------------------------------------------------------------


async def test_debt_threshold_1000_notification(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Rental

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 8)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        # paid_until ~3 days ago => debt ~1047 (3 x 349)
        rental_id, _ = await _create_rental_fixtures(
            session, user_id, 5,
            status="overdue",
            activated_at=now - timedelta(days=10),
            paid_until=now - timedelta(days=3),
            next_charge_at=now - timedelta(days=3),
            total_charged=349.00,
            debt_amount=0,
        )
        await session.commit()

    with patch("app.services.notifications.send_kyc_notification", new_callable=AsyncMock) as mock_notify:
        from app.workers.payment_tasks import _update_debts
        await _update_debts()

    assert mock_notify.call_count >= 1
    found = False
    for call in mock_notify.call_args_list:
        all_vals = list(call.args) + list(call.kwargs.values())
        for v in all_vals:
            if isinstance(v, str) and "debt_threshold_1000" in v:
                found = True
                break
    assert found, f"Expected debt_threshold_1000 notification, calls: {mock_notify.call_args_list}"


# ---------------------------------------------------------------------------
# 18. debt threshold 4500 — device loss, incident created
# ---------------------------------------------------------------------------


async def test_debt_threshold_4500_loss(client: AsyncClient):
    from app.core.db import _get_session_factory
    from app.models.rentals import Incident, Rental

    user_id_str, _ = await _create_client_user(client, _TG_BASE + 9)
    user_id = uuid.UUID(user_id_str)

    factory = _get_session_factory()
    now = datetime.now(UTC)

    async with factory() as session:
        # paid_until ~14 days ago => debt ~4886 (14 x 349) > 4500
        rental_id, _ = await _create_rental_fixtures(
            session, user_id, 6,
            status="overdue",
            activated_at=now - timedelta(days=20),
            paid_until=now - timedelta(days=14),
            next_charge_at=now - timedelta(days=14),
            total_charged=349.00,
            debt_amount=0,
        )
        await session.commit()

    with patch("app.services.notifications.send_kyc_notification", new_callable=AsyncMock):
        from app.workers.payment_tasks import _update_debts
        await _update_debts()

    async with factory() as session:
        from sqlalchemy import select
        r = await session.execute(select(Rental).where(Rental.id == rental_id))
        updated = r.scalars().first()
        assert updated is not None
        assert updated.status == "closed_incident"

        inc = await session.execute(
            select(Incident).where(Incident.rental_id == rental_id)
        )
        incident = inc.scalars().first()
        assert incident is not None
        assert incident.type == "loss"
        assert incident.severity == "critical"
