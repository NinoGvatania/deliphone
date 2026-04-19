"""Shared pytest fixtures."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator

import pytest
import redis.asyncio as aioredis
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

TEST_BOT_TOKEN = "test-bot-token-12345"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def monkeypatch_settings(monkeypatch: pytest.MonkeyPatch):
    """Set TG_BOT_TOKEN on the global settings object for the duration of the test."""
    monkeypatch.setattr(settings, "TG_BOT_TOKEN", TEST_BOT_TOKEN)


@pytest.fixture
async def redis_cleanup():
    """Flush rate-limit keys that share the current minute bucket after the test."""
    yield
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        bucket = int(time.time() // 60)
        patterns = [
            f"rl:tg_auth:*:{bucket}",
            f"rl:partner_login:*:{bucket}",
            f"rl:admin_login:*:{bucket}",
            f"rl:2fa:*:{bucket}",
        ]
        for pat in patterns:
            async for key in r.scan_iter(match=pat):
                await r.delete(key)
    finally:
        await r.aclose()
