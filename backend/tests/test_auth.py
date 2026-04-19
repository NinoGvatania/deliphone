"""Comprehensive auth tests for Telegram, partner, admin flows, JWT middleware, and rate limiting."""

from __future__ import annotations

import hashlib
import hmac
import time

import pyotp
from httpx import AsyncClient

from app.cli.seed import (
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    SEED_ADMIN_TOTP_SECRET,
    SEED_PARTNER_OPERATOR_EMAIL,
    SEED_PARTNER_OPERATOR_PASSWORD)
from app.services.telegram_auth import verify_telegram_auth

TEST_BOT_TOKEN = "test-bot-token-12345"


def _make_telegram_auth(bot_token: str, telegram_id: int = 123456789, **overrides) -> dict:
    """Build a dict with valid Telegram HMAC signature."""
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
    data["hash"] = hmac.new(secret, check_str.encode(), hashlib.sha256).hexdigest()
    return data


# ---------------------------------------------------------------------------
# 1-2. verify_telegram_auth unit tests (no DB, no server)
# ---------------------------------------------------------------------------


def test_telegram_auth_verify():
    data = _make_telegram_auth(TEST_BOT_TOKEN)
    assert verify_telegram_auth(data, TEST_BOT_TOKEN) is True


def test_telegram_auth_verify_invalid_hash():
    data = _make_telegram_auth(TEST_BOT_TOKEN)
    data["hash"] = "0" * 64
    assert verify_telegram_auth(data, TEST_BOT_TOKEN) is False


# ---------------------------------------------------------------------------
# 3. Expired auth_date — tested through the endpoint
# ---------------------------------------------------------------------------


async def test_telegram_auth_verify_expired(client: AsyncClient):
    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=900000001, auth_date=int(time.time()) - 90000)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# 4. Client auth — new user creation
# ---------------------------------------------------------------------------


async def test_client_auth_telegram_new_user(client: AsyncClient):
    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=100000001)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["user"]["telegram_id"] == 100000001


# ---------------------------------------------------------------------------
# 5. Client auth — existing user gets tokens and profile update
# ---------------------------------------------------------------------------


async def test_client_auth_telegram_existing_user(client: AsyncClient):
    tg_id = 100000002
    data1 = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=tg_id, first_name="Alice")
    resp1 = await client.post("/api/v1/client/auth/telegram", json=data1)
    assert resp1.status_code == 200
    user_id = resp1.json()["user"]["id"]

    data2 = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=tg_id, first_name="Alice2", username="alice2")
    resp2 = await client.post("/api/v1/client/auth/telegram", json=data2)
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["user"]["id"] == user_id
    assert "access_token" in body2


# ---------------------------------------------------------------------------
# 6. Partner login — valid credentials
# ---------------------------------------------------------------------------


async def test_partner_auth_login(client: AsyncClient):
    resp = await client.post(
        "/api/v1/partner/auth/login",
        json={"email": SEED_PARTNER_OPERATOR_EMAIL, "password": SEED_PARTNER_OPERATOR_PASSWORD})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == SEED_PARTNER_OPERATOR_EMAIL


# ---------------------------------------------------------------------------
# 7. Partner login — wrong password
# ---------------------------------------------------------------------------


async def test_partner_auth_login_invalid(client: AsyncClient):
    resp = await client.post(
        "/api/v1/partner/auth/login",
        json={"email": SEED_PARTNER_OPERATOR_EMAIL, "password": "wrong-password"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 8. Admin 2FA flow — login -> temp_token -> verify-2fa -> JWT
# ---------------------------------------------------------------------------


async def test_admin_auth_2fa_flow(client: AsyncClient):
    resp1 = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD})
    assert resp1.status_code == 200
    temp_token = resp1.json()["temp_token"]

    totp_code = pyotp.TOTP(SEED_ADMIN_TOTP_SECRET).now()
    resp2 = await client.post(
        "/api/v1/admin/auth/verify-2fa",
        json={"temp_token": temp_token, "totp_code": totp_code})
    assert resp2.status_code == 200
    body = resp2.json()
    assert "access_token" in body
    assert body["user"]["email"] == SEED_ADMIN_EMAIL


# ---------------------------------------------------------------------------
# 9. Admin 2FA — wrong TOTP code
# ---------------------------------------------------------------------------


async def test_admin_auth_2fa_wrong_code(client: AsyncClient):
    resp1 = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD})
    temp_token = resp1.json()["temp_token"]

    resp2 = await client.post(
        "/api/v1/admin/auth/verify-2fa",
        json={"temp_token": temp_token, "totp_code": "000000"})
    assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# 10. JWT middleware — /client/me without token returns 401
# ---------------------------------------------------------------------------


async def test_jwt_middleware_client_protects(client: AsyncClient):
    resp = await client.get("/api/v1/client/me")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 11. JWT middleware — /client/me with valid JWT returns user data
# ---------------------------------------------------------------------------


async def test_jwt_middleware_client_accepts(client: AsyncClient):
    tg_data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=100000011)
    auth_resp = await client.post("/api/v1/client/auth/telegram", json=tg_data)
    assert auth_resp.status_code == 200
    token = auth_resp.json()["access_token"]

    me_resp = await client.get("/api/v1/client/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["telegram_id"] == 100000011


# ---------------------------------------------------------------------------
# 12. Rate limit — telegram auth (10 per minute window)
# ---------------------------------------------------------------------------


async def test_rate_limit_telegram_auth(client: AsyncClient):
    for i in range(10):
        data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=200000000 + i)
        resp = await client.post("/api/v1/client/auth/telegram", json=data)
        assert resp.status_code in (200, 401), f"call {i+1} unexpected {resp.status_code}"

    data = _make_telegram_auth(TEST_BOT_TOKEN, telegram_id=200000010)
    resp = await client.post("/api/v1/client/auth/telegram", json=data)
    assert resp.status_code == 429


# ---------------------------------------------------------------------------
# 13. Rate limit — partner login (5 per minute window)
# ---------------------------------------------------------------------------


async def test_rate_limit_partner_login(client: AsyncClient):
    for i in range(5):
        resp = await client.post(
            "/api/v1/partner/auth/login",
            json={"email": SEED_PARTNER_OPERATOR_EMAIL, "password": "wrong"})
        assert resp.status_code in (401, 200), f"call {i+1} unexpected {resp.status_code}"

    resp = await client.post(
        "/api/v1/partner/auth/login",
        json={"email": SEED_PARTNER_OPERATOR_EMAIL, "password": "wrong"})
    assert resp.status_code == 429
