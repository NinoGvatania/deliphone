"""Auth primitives — JWT encode/decode and password hashing helpers.

Kept as thin wrappers so the rest of the app depends on a stable interface.
Actual auth flows (SMS, partner login, admin 2FA) ship in later phases.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

ALGORITHM = "HS256"
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(raw: str) -> str:
    return _pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _pwd_context.verify(raw, hashed)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    ttl_seconds: int | None = None,
) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(seconds=ttl_seconds or settings.JWT_ACCESS_TTL)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
