"""Shared pytest fixtures."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator

import pytest
import redis.asyncio as aioredis
from httpx import ASGITransport, AsyncClient

from app.core.config import settings

TEST_BOT_TOKEN = "test-bot-token-12345"


@pytest.fixture(scope="session")
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture(scope="session", autouse=True)
def _patch_bot_token():
    """Set TG_BOT_TOKEN on the global settings for the whole session."""
    original = settings.TG_BOT_TOKEN
    settings.__dict__["TG_BOT_TOKEN"] = TEST_BOT_TOKEN
    yield
    settings.__dict__["TG_BOT_TOKEN"] = original


@pytest.fixture(autouse=True)
def _monkeypatch_tg_token(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "TG_BOT_TOKEN", TEST_BOT_TOKEN)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    # Reset the lazy engine so it binds to the current event loop.
    import app.core.db as db_mod
    db_mod._engine = None
    db_mod._session_factory = None

    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Dispose engine after test to avoid connection leaks.
    if db_mod._engine is not None:
        await db_mod._engine.dispose()
        db_mod._engine = None
        db_mod._session_factory = None


@pytest.fixture(autouse=True)
async def _redis_cleanup():
    """Flush rate-limit keys for the current minute after each test."""
    yield
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        bucket = int(time.time() // 60)
        for prefix in ("rl:tg_auth", "rl:partner_login", "rl:admin_login", "rl:2fa"):
            async for key in r.scan_iter(match=f"{prefix}:*:{bucket}"):
                await r.delete(key)
        await r.aclose()
    except Exception:
        pass
