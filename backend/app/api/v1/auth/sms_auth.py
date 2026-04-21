"""SMS-based registration and login endpoints (SPEC §14.1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.db import get_session
from app.core.security import create_access_token, create_refresh_token
from app.models.users import User
from app.services.sms import generate_code, get_sms_provider

router = APIRouter()

SMS_CODE_TTL = 300  # 5 minutes
SMS_CODE_PREFIX = "sms_code:"


async def _get_redis() -> aioredis.Redis:
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield r  # type: ignore[misc]
    finally:
        await r.aclose()


# ── Schemas ────────────────────────────────────────────────────────────────


class SendCodeRequest(BaseModel):
    phone_number: str


class SendCodeResponse(BaseModel):
    sent: bool = True


class RegisterVerifyRequest(BaseModel):
    phone_number: str
    code: str
    first_name: str
    email: str | None = None
    consent: bool


class LoginVerifyRequest(BaseModel):
    phone_number: str
    code: str


class UserBrief(BaseModel):
    id: str
    phone_number: str
    first_name: str
    status: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserBrief


# ── Endpoints ──────────────────────────────────────────────────────────────


@router.post("/register/send-code", response_model=SendCodeResponse)
async def register_send_code(
    body: SendCodeRequest,
    redis: aioredis.Redis = Depends(_get_redis),
) -> SendCodeResponse:
    code = generate_code()
    await redis.set(f"{SMS_CODE_PREFIX}{body.phone_number}", code, ex=SMS_CODE_TTL)

    provider = get_sms_provider()
    await provider.send(body.phone_number, f"Делифон: ваш код {code}")

    return SendCodeResponse()


@router.post("/register/verify", response_model=AuthResponse)
async def register_verify(
    body: RegisterVerifyRequest,
    redis: aioredis.Redis = Depends(_get_redis),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    if not body.consent:
        raise HTTPException(422, "consent is required")

    stored_code = await redis.get(f"{SMS_CODE_PREFIX}{body.phone_number}")
    if stored_code is None or stored_code != body.code:
        raise HTTPException(401, "invalid or expired code")

    await redis.delete(f"{SMS_CODE_PREFIX}{body.phone_number}")

    result = await session.execute(
        select(User).where(User.phone_number == body.phone_number)
    )
    user = result.scalars().first()

    if user is None:
        user = User(
            phone_number=body.phone_number,
            first_name=body.first_name,
            email=body.email,
        )
        session.add(user)
        await session.flush()
    else:
        # Existing user — treat as login
        pass

    await session.commit()

    access = create_access_token(str(user.id), "client")
    refresh = create_refresh_token(str(user.id), "client")

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserBrief(
            id=str(user.id),
            phone_number=user.phone_number,
            first_name=user.first_name,
            status=user.status,
        ),
    )


@router.post("/login/send-code", response_model=SendCodeResponse)
async def login_send_code(
    body: SendCodeRequest,
    redis: aioredis.Redis = Depends(_get_redis),
) -> SendCodeResponse:
    code = generate_code()
    await redis.set(f"{SMS_CODE_PREFIX}{body.phone_number}", code, ex=SMS_CODE_TTL)

    provider = get_sms_provider()
    await provider.send(body.phone_number, f"Делифон: ваш код {code}")

    return SendCodeResponse()


@router.post("/login/verify", response_model=AuthResponse)
async def login_verify(
    body: LoginVerifyRequest,
    redis: aioredis.Redis = Depends(_get_redis),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    stored_code = await redis.get(f"{SMS_CODE_PREFIX}{body.phone_number}")
    if stored_code is None or stored_code != body.code:
        raise HTTPException(401, "invalid or expired code")

    await redis.delete(f"{SMS_CODE_PREFIX}{body.phone_number}")

    result = await session.execute(
        select(User).where(User.phone_number == body.phone_number)
    )
    user = result.scalars().first()
    if user is None:
        raise HTTPException(404, "user not found — register first")

    if user.is_blocked:
        raise HTTPException(403, "account is blocked")

    access = create_access_token(str(user.id), "client")
    refresh = create_refresh_token(str(user.id), "client")

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserBrief(
            id=str(user.id),
            phone_number=user.phone_number,
            first_name=user.first_name,
            status=user.status,
        ),
    )
