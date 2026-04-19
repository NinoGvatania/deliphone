"""Auth primitives — JWT encode/decode and password hashing helpers.

Tokens carry "sub", "role", "type", "iat", "exp". Role is one of
"client", "partner", "admin" — enforced by the respective auth flows.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

ALGORITHM = "HS256"
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Role = Literal["client", "partner", "admin"]


def hash_password(raw: str) -> str:
    return _pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _pwd_context.verify(raw, hashed)


def create_access_token(
    subject: str,
    role: Role,
    extra_claims: dict[str, Any] | None = None,
    ttl_minutes: int | None = None,
) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(minutes=ttl_minutes or settings.JWT_ACCESS_TTL_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    role: Role,
) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_temp_2fa_token(subject: str) -> str:
    """Short-lived token issued after password check, before TOTP verification."""
    now = datetime.now(UTC)
    exp = now + timedelta(minutes=settings.JWT_TEMP_TTL_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": "admin",
        "type": "temp_2fa",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
