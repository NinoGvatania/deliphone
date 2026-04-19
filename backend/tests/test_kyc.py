"""KYC end-to-end tests: client/partner flows, admin moderation, crypto, storage, notifications."""

from __future__ import annotations

import base64
import hashlib
import os
import random
import time
from datetime import date, timedelta
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

# Use a random base to avoid collisions with previous test runs on shared DB
_TG_BASE = random.randint(400_000_000, 499_999_999)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_telegram_auth(bot_token: str, telegram_id: int = 123456789, **overrides) -> dict:
    """Build a dict with valid Telegram HMAC signature."""
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
    """Create a user via Telegram auth, return (user_id, access_token)."""
    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=telegram_id)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    return body["user"]["id"], body["access_token"]


async def _get_partner_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/api/v1/partner/auth/login",
        json={"email": SEED_PARTNER_OPERATOR_EMAIL, "password": SEED_PARTNER_OPERATOR_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


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


def _valid_kyc_body(submission_id: str, passport_series: str = "1234", passport_number: str = "567890") -> dict:
    """KYC submit payload for a valid adult."""
    return {
        "submission_id": submission_id,
        "full_name": "Иван Иванов",
        "birth_date": str(date.today() - timedelta(days=365 * 25)),
        "passport_series": passport_series,
        "passport_number": passport_number,
        "passport_issued_by": "ОВД г. Москвы",
        "passport_issue_date": "2015-06-15",
        "registration_address": "г. Москва, ул. Ленина, д.1",
        "consent_pdn": True,
        "consent_offer": True,
    }


def _random_passport() -> tuple[str, str]:
    """Generate random passport series and number to avoid cross-run collisions."""
    series = f"{random.randint(1000, 9999)}"
    number = f"{random.randint(100000, 999999)}"
    return series, number


# ---------------------------------------------------------------------------
# 1. KYC init — client
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
async def test_kyc_init_client(mock_get_storage, client: AsyncClient):
    mock_get_storage.return_value = _mock_storage()
    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 1)

    resp = await client.post(
        "/api/v1/client/me/kyc/init",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "submission_id" in body
    assert "upload_urls" in body
    urls = body["upload_urls"]
    assert set(urls.keys()) == {"passport_main", "passport_reg", "selfie", "video"}


# ---------------------------------------------------------------------------
# 2. KYC submit — valid
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_submit_valid(mock_bot, mock_get_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_get_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 2)
    headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=headers)
    assert init_resp.status_code == 200
    submission_id = init_resp.json()["submission_id"]

    ps, pn = _random_passport()
    body = _valid_kyc_body(submission_id, passport_series=ps, passport_number=pn)
    resp = await client.post("/api/v1/client/me/kyc/submit", json=body, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# 3. KYC submit — underage (Pydantic validation)
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
async def test_kyc_submit_underage(mock_get_storage, client: AsyncClient):
    mock_get_storage.return_value = _mock_storage()
    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 3)
    headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=headers)
    assert init_resp.status_code == 200
    submission_id = init_resp.json()["submission_id"]

    body = _valid_kyc_body(submission_id)
    body["birth_date"] = str(date.today() - timedelta(days=365 * 15))  # 15 years old

    resp = await client.post("/api/v1/client/me/kyc/submit", json=body, headers=headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 4. KYC submit — duplicate passport (process_kyc_submission task)
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_submit_duplicate_passport(mock_bot, mock_get_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_get_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    # Create two users
    _, token1 = await _create_client_user(client, telegram_id=_TG_BASE + 4)
    _, token2 = await _create_client_user(client, telegram_id=_TG_BASE + 5)

    # Use a shared random passport for both users
    dup_series, dup_number = _random_passport()

    # Submit KYC for user 1
    h1 = {"Authorization": f"Bearer {token1}"}
    init1 = await client.post("/api/v1/client/me/kyc/init", headers=h1)
    sub_id1 = init1.json()["submission_id"]
    body1 = _valid_kyc_body(sub_id1, passport_series=dup_series, passport_number=dup_number)
    resp1 = await client.post("/api/v1/client/me/kyc/submit", json=body1, headers=h1)
    assert resp1.status_code == 200

    # Submit KYC for user 2 with SAME passport
    h2 = {"Authorization": f"Bearer {token2}"}
    init2 = await client.post("/api/v1/client/me/kyc/init", headers=h2)
    sub_id2 = init2.json()["submission_id"]
    body2 = _valid_kyc_body(sub_id2, passport_series=dup_series, passport_number=dup_number)
    resp2 = await client.post("/api/v1/client/me/kyc/submit", json=body2, headers=h2)
    assert resp2.status_code == 200

    # Run the Celery task directly for user 2's submission
    from app.workers.kyc_tasks import _process

    result = await _process(sub_id2)
    assert "duplicate_passport" in result["flags"]


# ---------------------------------------------------------------------------
# 5. KYC submit — blacklist match
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_submit_blacklist(mock_bot, mock_get_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_get_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    passport_series, passport_number = _random_passport()
    passport_hash = hashlib.sha256((passport_series + passport_number).encode()).hexdigest()

    # Insert blacklist entry directly into DB
    from app.core.db import _get_session_factory
    from app.models.ops import Blacklist

    factory = _get_session_factory()
    async with factory() as session:
        session.add(Blacklist(passport_hash=passport_hash, reason="test blacklist"))
        await session.commit()

    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 6)
    headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=headers)
    sub_id = init_resp.json()["submission_id"]

    body = _valid_kyc_body(sub_id, passport_series=passport_series, passport_number=passport_number)
    resp = await client.post("/api/v1/client/me/kyc/submit", json=body, headers=headers)
    assert resp.status_code == 200

    from app.workers.kyc_tasks import _process

    result = await _process(sub_id)
    assert "blacklisted" in result["flags"]
    assert result["auto_rejected"] is True


# ---------------------------------------------------------------------------
# 6. Partner registration session — create + status
# ---------------------------------------------------------------------------


async def test_kyc_partner_registration_session(client: AsyncClient):
    token = await _get_partner_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/v1/partner/registrations", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "session_id" in body
    assert "qr_url" in body

    session_id = body["session_id"]
    status_resp = await client.get(
        f"/api/v1/partner/registrations/{session_id}/status",
        headers=headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# 7. Partner KYC flow — init + submit via partner endpoints
# ---------------------------------------------------------------------------


@patch("app.api.v1.partner.clients.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_partner_flow(mock_bot, mock_get_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_get_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    partner_token = await _get_partner_token(client)
    p_headers = {"Authorization": f"Bearer {partner_token}"}

    # Create a client user
    user_id, _ = await _create_client_user(client, telegram_id=_TG_BASE + 7)

    # Create registration session and attach user to partner
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.partners import PartnerLocation, PartnerUser, RegistrationSession

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(PartnerUser).where(PartnerUser.email == SEED_PARTNER_OPERATOR_EMAIL)
        )
        partner_user = result.scalars().first()

        loc_result = await session.execute(
            select(PartnerLocation).where(
                PartnerLocation.partner_id == partner_user.partner_id,
            )
        )
        location = loc_result.scalars().first()

        reg = RegistrationSession(
            partner_id=partner_user.partner_id,
            partner_user_id=partner_user.id,
            location_id=location.id,
            status="attached",
            attached_user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
        )
        session.add(reg)
        await session.commit()

    # Partner inits KYC for this user
    init_resp = await client.post(
        f"/api/v1/partner/clients/{user_id}/kyc/init",
        headers=p_headers,
    )
    assert init_resp.status_code == 200, init_resp.text
    sub_id = init_resp.json()["submission_id"]
    assert "upload_urls" in init_resp.json()

    # Partner submits KYC
    ps, pn = _random_passport()
    body = _valid_kyc_body(sub_id, passport_series=ps, passport_number=pn)
    submit_resp = await client.post(
        f"/api/v1/partner/clients/{user_id}/kyc/submit",
        json=body,
        headers=p_headers,
    )
    assert submit_resp.status_code == 200, submit_resp.text
    assert submit_resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# 8. Admin approve
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.api.v1.admin.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_admin_approve(mock_bot, mock_admin_storage, mock_client_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_client_storage.return_value = storage
    mock_admin_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    # Create user and submit KYC
    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 8)
    c_headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=c_headers)
    sub_id = init_resp.json()["submission_id"]
    ps, pn = _random_passport()
    body = _valid_kyc_body(sub_id, passport_series=ps, passport_number=pn)
    await client.post("/api/v1/client/me/kyc/submit", json=body, headers=c_headers)

    # Admin flow
    admin_token = await _get_admin_token(client)
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    queue_resp = await client.get("/api/v1/admin/kyc/queue?status=pending", headers=a_headers)
    assert queue_resp.status_code == 200
    items = queue_resp.json()["items"]
    assert len(items) > 0

    approve_resp = await client.post(f"/api/v1/admin/kyc/{sub_id}/approve", headers=a_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"

    # Verify user kyc_status updated
    me_resp = await client.get("/api/v1/client/me", headers=c_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["kyc_status"] == "approved"


# ---------------------------------------------------------------------------
# 9. Admin reject
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.api.v1.admin.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_admin_reject(mock_bot, mock_admin_storage, mock_client_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_client_storage.return_value = storage
    mock_admin_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 9)
    c_headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=c_headers)
    sub_id = init_resp.json()["submission_id"]
    ps, pn = _random_passport()
    body = _valid_kyc_body(sub_id, passport_series=ps, passport_number=pn)
    await client.post("/api/v1/client/me/kyc/submit", json=body, headers=c_headers)

    admin_token = await _get_admin_token(client)
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    reject_resp = await client.post(
        f"/api/v1/admin/kyc/{sub_id}/reject",
        json={"reason_code": "fake_documents", "reason_text": "Documents look forged"},
        headers=a_headers,
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"


# ---------------------------------------------------------------------------
# 10. Admin request-resubmit
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.api.v1.admin.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_admin_request_resubmit(mock_bot, mock_admin_storage, mock_client_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_client_storage.return_value = storage
    mock_admin_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 10)
    c_headers = {"Authorization": f"Bearer {token}"}

    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=c_headers)
    sub_id = init_resp.json()["submission_id"]
    ps, pn = _random_passport()
    body = _valid_kyc_body(sub_id, passport_series=ps, passport_number=pn)
    await client.post("/api/v1/client/me/kyc/submit", json=body, headers=c_headers)

    admin_token = await _get_admin_token(client)
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.post(
        f"/api/v1/admin/kyc/{sub_id}/request-resubmit",
        json={"requested_files": ["selfie", "passport_main"], "comment": "Photo blurry"},
        headers=a_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resubmit_requested"


# ---------------------------------------------------------------------------
# 11. Client resubmit after rejection
# ---------------------------------------------------------------------------


@patch("app.api.v1.client.kyc.get_storage")
@patch("app.api.v1.admin.kyc.get_storage")
@patch("app.services.notifications.get_telegram_bot")
async def test_kyc_resubmit(mock_bot, mock_admin_storage, mock_client_storage, client: AsyncClient):
    storage = _mock_storage()
    mock_client_storage.return_value = storage
    mock_admin_storage.return_value = storage
    mock_bot.return_value = AsyncMock()

    _, token = await _create_client_user(client, telegram_id=_TG_BASE + 11)
    c_headers = {"Authorization": f"Bearer {token}"}

    # Init + submit
    init_resp = await client.post("/api/v1/client/me/kyc/init", headers=c_headers)
    sub_id = init_resp.json()["submission_id"]
    ps, pn = _random_passport()
    body = _valid_kyc_body(sub_id, passport_series=ps, passport_number=pn)
    await client.post("/api/v1/client/me/kyc/submit", json=body, headers=c_headers)

    # Admin rejects
    admin_token = await _get_admin_token(client)
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        f"/api/v1/admin/kyc/{sub_id}/reject",
        json={"reason_code": "other", "reason_text": "Please redo"},
        headers=a_headers,
    )

    # Client resubmits
    resubmit_resp = await client.post("/api/v1/client/me/kyc/resubmit", headers=c_headers)
    assert resubmit_resp.status_code == 200, resubmit_resp.text
    new_body = resubmit_resp.json()
    assert "submission_id" in new_body
    assert new_body["submission_id"] != sub_id
    assert "upload_urls" in new_body


# ---------------------------------------------------------------------------
# 12. Crypto — encrypt + decrypt round-trip
# ---------------------------------------------------------------------------


def test_crypto_encrypt_decrypt(monkeypatch):
    test_key = base64.b64encode(os.urandom(32)).decode()
    monkeypatch.setattr(settings, "KYC_ENCRYPTION_KEY", test_key)

    from app.core.encryption import decrypt, encrypt

    plaintext = "1234 567890"
    ciphertext = encrypt(plaintext)
    assert ciphertext != plaintext
    assert decrypt(ciphertext) == plaintext


# ---------------------------------------------------------------------------
# 13. Crypto — different nonces
# ---------------------------------------------------------------------------


def test_crypto_different_nonces(monkeypatch):
    test_key = base64.b64encode(os.urandom(32)).decode()
    monkeypatch.setattr(settings, "KYC_ENCRYPTION_KEY", test_key)

    from app.core.encryption import encrypt

    plaintext = "same data"
    ct1 = encrypt(plaintext)
    ct2 = encrypt(plaintext)
    assert ct1 != ct2


# ---------------------------------------------------------------------------
# 14. Storage — presigned upload URL
# ---------------------------------------------------------------------------


def test_storage_presigned_upload():
    storage = _mock_storage()
    url = storage.generate_upload_url("kyc-documents", "test/key.jpg", content_type="image/jpeg")
    assert isinstance(url, str)
    assert url.startswith("https://")


# ---------------------------------------------------------------------------
# 15. Storage — signed read URL
# ---------------------------------------------------------------------------


def test_storage_signed_read():
    storage = _mock_storage()
    url = storage.generate_read_url("kyc-documents", "test/key.jpg")
    assert isinstance(url, str)
    assert url.startswith("https://")


# ---------------------------------------------------------------------------
# 16. Notifications — kyc_approved sends Telegram message
# ---------------------------------------------------------------------------


async def test_notifications_kyc_approved():
    mock_bot = AsyncMock()
    mock_session = AsyncMock()
    # mock session.add to be a no-op
    mock_session.add = MagicMock()

    user = MagicMock()
    user.id = "00000000-0000-0000-0000-000000000001"
    user.telegram_id = 123456789

    with patch("app.services.notifications.get_telegram_bot", return_value=mock_bot):
        from app.services.notifications import notify_kyc_approved

        await notify_kyc_approved(mock_session, user)

    mock_bot.send_message.assert_called_once()
    call_args = mock_bot.send_message.call_args
    assert call_args[0][0] == 123456789  # telegram_id
