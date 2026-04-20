"""End-to-end integration tests for rental, incident, debt, subscription, and chat flows."""

from __future__ import annotations

import hashlib
import random
import time
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pyotp
import pytest
from httpx import AsyncClient

from app.cli.seed import (
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    SEED_ADMIN_TOTP_SECRET,
    SEED_PARTNER_OPERATOR_EMAIL,
    SEED_PARTNER_OPERATOR_PASSWORD,
)
from app.core.config import settings

TEST_BOT_TOKEN = "test-bot-token-12345"

_TG_BASE = random.randint(600_000_000, 699_999_999)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_telegram_auth(bot_token: str, telegram_id: int = 123456789, **overrides) -> dict:
    import hmac as _hmac

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
    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=telegram_id)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    return body["user"]["id"], body["access_token"]


async def _get_admin_token(client: AsyncClient) -> str:
    resp1 = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp1.status_code == 200, resp1.text
    temp_token = resp1.json()["temp_token"]
    totp_code = pyotp.TOTP(SEED_ADMIN_TOTP_SECRET).now()
    resp2 = await client.post(
        "/api/v1/admin/auth/verify-2fa",
        json={"temp_token": temp_token, "totp_code": totp_code},
    )
    assert resp2.status_code == 200, resp2.text
    return resp2.json()["access_token"]


def _mock_storage():
    storage = MagicMock()
    storage.generate_upload_url.return_value = "https://minio:9000/presigned-upload"
    storage.generate_read_url.return_value = "https://minio:9000/presigned-read"
    storage.head_object.return_value = True
    return storage


def _random_passport() -> tuple[str, str]:
    series = f"{random.randint(1000, 9999)}"
    number = f"{random.randint(100000, 999999)}"
    return series, number


async def _setup_approved_user(client: AsyncClient, telegram_id: int) -> tuple[str, str]:
    """Create user, submit KYC, admin-approve, add payment method. Returns (user_id, token)."""
    from app.core.db import _get_session_factory
    from app.models.users import KycSubmission, PaymentMethod, User

    user_id, token = await _create_client_user(client, telegram_id)

    # Directly set kyc_status and add payment method via DB
    factory = _get_session_factory()
    async with factory() as session:
        from sqlalchemy import select

        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        user.kyc_status = "approved"

        pm = PaymentMethod(
            user_id=uuid.UUID(user_id),
            yookassa_token="pm_test_token_123",
            card_last4="4242",
            card_network="visa",
            is_default=True,
        )
        session.add(pm)
        await session.commit()

    return user_id, token


async def _create_device_at_location(location_id: uuid.UUID) -> uuid.UUID:
    """Create a test device at the given location."""
    from app.core.db import _get_session_factory
    from app.models.catalog import Device

    factory = _get_session_factory()
    short_code = f"{random.randint(100000, 999999)}"
    imei = f"{random.randint(100000000000000, 999999999999999)}"

    async with factory() as session:
        device = Device(
            imei=imei,
            serial_number=f"SN{short_code}",
            short_code=short_code,
            model="Xiaomi Redmi A5",
            color="Black",
            storage="128GB",
            condition_grade=9,
            current_custody="location",
            current_location_id=location_id,
            status="active",
        )
        session.add(device)
        await session.commit()
        await session.refresh(device)
        return device.id


async def _get_seed_location_id() -> uuid.UUID:
    """Get the seeded partner location ID."""
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.partners import PartnerLocation

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(PartnerLocation).limit(1))
        loc = result.scalars().first()
        return loc.id


# ── Test: Full rental flow ───────────────────────────────────────────────────


@patch("app.services.notifications.get_telegram_bot")
async def test_full_rental_flow(mock_bot, client: AsyncClient):
    """TG auth -> KYC approve -> create rental -> confirm pickup -> verify payment."""
    mock_bot.return_value = AsyncMock()

    tg_id = _TG_BASE + 1
    user_id, token = await _setup_approved_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    location_id = await _get_seed_location_id()
    device_id = await _create_device_at_location(location_id)

    # Create rental
    resp = await client.post(
        "/api/v1/client/rentals",
        json={"device_id": str(device_id), "location_id": str(location_id)},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    rental = resp.json()
    rental_id = rental["id"]
    assert rental["status"] == "booked"

    # Confirm pickup
    pickup_resp = await client.post(
        f"/api/v1/client/rentals/{rental_id}/confirm-pickup",
        headers=headers,
    )
    assert pickup_resp.status_code == 200, pickup_resp.text
    pickup_data = pickup_resp.json()
    assert pickup_data["status"] == "active"
    assert "paid_until" in pickup_data

    # Verify payment was created
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.rentals import Payment

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(Payment).where(
                Payment.rental_id == rental_id,
                Payment.type == "daily_charge",
            )
        )
        payment = result.scalars().first()
        assert payment is not None
        assert float(payment.amount) == 349.0


# ── Test: Incident damage flow ───────────────────────────────────────────────


@patch("app.services.notifications.get_telegram_bot")
async def test_incident_damage_flow(mock_bot, client: AsyncClient):
    """Active rental -> create damage incident -> admin quote -> client accept -> resolved."""
    mock_bot.return_value = AsyncMock()

    tg_id = _TG_BASE + 2
    user_id, token = await _setup_approved_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    location_id = await _get_seed_location_id()
    device_id = await _create_device_at_location(location_id)

    # Create and activate rental
    resp = await client.post(
        "/api/v1/client/rentals",
        json={"device_id": str(device_id), "location_id": str(location_id)},
        headers=headers,
    )
    rental_id = resp.json()["id"]
    await client.post(f"/api/v1/client/rentals/{rental_id}/confirm-pickup", headers=headers)

    # Create damage incident
    inc_resp = await client.post(
        "/api/v1/client/incidents",
        json={"rental_id": rental_id, "type": "damage", "description": "Cracked screen"},
        headers=headers,
    )
    assert inc_resp.status_code == 201, inc_resp.text
    incident_id = inc_resp.json()["id"]
    assert inc_resp.json()["type"] == "damage"

    # Admin sets quote
    admin_token = await _get_admin_token(client)
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    quote_resp = await client.post(
        f"/api/v1/admin/incidents/{incident_id}/update-quote",
        json={"repair_estimate": 3200.0, "client_charge": 2200.0},
        headers=a_headers,
    )
    assert quote_resp.status_code == 200

    # Client accepts
    accept_resp = await client.post(
        f"/api/v1/client/incidents/{incident_id}/accept",
        headers=headers,
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "accepted"


# ── Test: Malfunction with parallel rental ───────────────────────────────────


@patch("app.services.notifications.get_telegram_bot")
async def test_incident_malfunction_parallel(mock_bot, client: AsyncClient):
    """Active rental -> malfunction -> rental frozen -> can create new rental."""
    mock_bot.return_value = AsyncMock()

    tg_id = _TG_BASE + 3
    user_id, token = await _setup_approved_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    location_id = await _get_seed_location_id()
    device_id_1 = await _create_device_at_location(location_id)
    device_id_2 = await _create_device_at_location(location_id)

    # Create and activate first rental
    resp = await client.post(
        "/api/v1/client/rentals",
        json={"device_id": str(device_id_1), "location_id": str(location_id)},
        headers=headers,
    )
    rental_id_1 = resp.json()["id"]
    await client.post(f"/api/v1/client/rentals/{rental_id_1}/confirm-pickup", headers=headers)

    # Report malfunction
    inc_resp = await client.post(
        "/api/v1/client/incidents",
        json={"rental_id": rental_id_1, "type": "malfunction", "description": "Screen flickering"},
        headers=headers,
    )
    assert inc_resp.status_code == 201

    # Verify rental is frozen
    rental_resp = await client.get(f"/api/v1/client/rentals/{rental_id_1}", headers=headers)
    assert rental_resp.json()["status"] == "frozen_incident"

    # Verify device custody changed
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id_1))
        device = result.scalars().first()
        assert device.current_custody == "in_service"

    # Can create a new rental with another device
    resp2 = await client.post(
        "/api/v1/client/rentals",
        json={"device_id": str(device_id_2), "location_id": str(location_id)},
        headers=headers,
    )
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["status"] == "booked"


# ── Test: Poteryashka flow ───────────────────────────────────────────────────


@patch("app.services.notifications.get_telegram_bot")
async def test_poteryashka_flow(mock_bot, client: AsyncClient):
    """Active rental -> set overdue -> call _update_debts with debt >= 4500 -> verify outcome."""
    mock_bot.return_value = AsyncMock()

    tg_id = _TG_BASE + 4
    user_id, token = await _setup_approved_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    location_id = await _get_seed_location_id()
    device_id = await _create_device_at_location(location_id)

    # Create and activate rental
    resp = await client.post(
        "/api/v1/client/rentals",
        json={"device_id": str(device_id), "location_id": str(location_id)},
        headers=headers,
    )
    rental_id = resp.json()["id"]
    await client.post(f"/api/v1/client/rentals/{rental_id}/confirm-pickup", headers=headers)

    # Set rental to overdue with paid_until far in the past (>13 days = >4500 debt)
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.models.finance import Debt
    from app.models.rentals import Incident, Rental

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Rental).where(Rental.id == rental_id))
        rental = result.scalars().first()
        rental.status = "overdue"
        rental.paid_until = datetime.now(UTC) - timedelta(days=14)  # 14 * 349 = 4886 > 4500
        await session.commit()

    # Run _update_debts
    from app.workers.payment_tasks import _update_debts

    result = await _update_debts()
    assert result["updates"] >= 1

    # Verify: rental closed_incident, incident created, device missing
    async with factory() as session:
        rental_result = await session.execute(select(Rental).where(Rental.id == rental_id))
        rental = rental_result.scalars().first()
        assert rental.status == "closed_incident"

        inc_result = await session.execute(
            select(Incident).where(
                Incident.rental_id == rental_id,
                Incident.type == "loss",
            )
        )
        incident = inc_result.scalars().first()
        assert incident is not None
        assert incident.severity == "critical"
        assert incident.reported_by == "system"

        device_result = await session.execute(select(Device).where(Device.id == device_id))
        device = device_result.scalars().first()
        assert device.current_custody == "missing"

        # Verify Debt record created
        debt_result = await session.execute(
            select(Debt).where(Debt.user_id == user_id)
        )
        debt = debt_result.scalars().first()
        # Debt exists if debt > deposit
        # deposit is 4500 (no udobno), debt ~4886. Remainder should exist.
        assert debt is not None
        assert float(debt.amount) > 0


# ── Test: Subscription cancel ────────────────────────────────────────────────


@patch("app.services.yookassa.YookassaClient.create_payment")
@patch("app.services.notifications.get_telegram_bot")
async def test_subscription_cancel(mock_bot, mock_yookassa, client: AsyncClient):
    """Create subscription -> cancel -> verify ends_at set."""
    mock_bot.return_value = AsyncMock()
    mock_yookassa.return_value = {"id": "pay_test_123", "status": "succeeded"}

    tg_id = _TG_BASE + 5
    user_id, token = await _setup_approved_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create subscription
    sub_resp = await client.post("/api/v1/client/me/subscription", headers=headers)
    assert sub_resp.status_code == 200, sub_resp.text
    sub_data = sub_resp.json()
    assert sub_data["status"] == "active"

    # Cancel
    cancel_resp = await client.post("/api/v1/client/me/subscription/cancel", headers=headers)
    assert cancel_resp.status_code == 200, cancel_resp.text
    cancel_data = cancel_resp.json()
    assert cancel_data["status"] == "cancelled"
    assert cancel_data["ends_at"] is not None


# ── Test: Chat flow ──────────────────────────────────────────────────────────


@patch("app.services.notifications.get_telegram_bot")
async def test_chat_flow(mock_bot, client: AsyncClient):
    """Create chat -> send message -> list messages -> verify."""
    mock_bot.return_value = AsyncMock()

    tg_id = _TG_BASE + 6
    _, token = await _create_client_user(client, tg_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create chat
    chat_resp = await client.post("/api/v1/client/support/chats", headers=headers)
    assert chat_resp.status_code == 200, chat_resp.text
    chat_id = chat_resp.json()["id"]

    # Send message
    msg_resp = await client.post(
        f"/api/v1/client/support/chats/{chat_id}/messages",
        json={"content": "Привет, у меня вопрос!"},
        headers=headers,
    )
    assert msg_resp.status_code == 200, msg_resp.text
    assert msg_resp.json()["sent"] is True

    # List messages
    list_resp = await client.get(
        f"/api/v1/client/support/chats/{chat_id}/messages",
        headers=headers,
    )
    assert list_resp.status_code == 200
    messages = list_resp.json()
    assert len(messages) >= 1
    assert messages[0]["content"] == "Привет, у меня вопрос!"
    assert messages[0]["sender_type"] == "user"

    # List chats
    chats_resp = await client.get("/api/v1/client/support/chats", headers=headers)
    assert chats_resp.status_code == 200
    chats = chats_resp.json()
    assert len(chats) >= 1
    assert any(c["id"] == chat_id for c in chats)
