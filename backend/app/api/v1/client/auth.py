"""Client auth endpoints — Telegram Login Widget (SPEC §14.1)."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.partners import RegistrationSession
from app.models.users import User
from app.schemas.auth import (
    ClientAuthResponse,
    RefreshRequest,
    TelegramAuthRequest,
    TokenResponse,
    UserBrief,
)
from app.core.rate_limit import rate_limit_telegram_auth
from app.services.telegram_auth import verify_telegram_auth

router = APIRouter(prefix="/auth", tags=["client-auth"])

_AUTH_DATA_MAX_AGE = 86400  # 24 hours


@router.post("/telegram", response_model=ClientAuthResponse, dependencies=[Depends(rate_limit_telegram_auth)])
async def auth_telegram(
    body: TelegramAuthRequest,
    session: AsyncSession = Depends(get_session),
) -> ClientAuthResponse:
    tg_data = body.model_dump(exclude={"reg_session_id"})
    if not verify_telegram_auth(tg_data, settings.TG_BOT_TOKEN):
        raise HTTPException(status_code=401, detail="invalid telegram auth")

    if int(time.time()) - body.auth_date > _AUTH_DATA_MAX_AGE:
        raise HTTPException(status_code=401, detail="auth data expired")

    result = await session.execute(
        select(User).where(User.telegram_id == body.id)
    )
    user = result.scalars().first()

    if user is None:
        user = User(
            telegram_id=body.id,
            telegram_username=body.username,
            telegram_first_name=body.first_name,
            telegram_last_name=body.last_name,
            telegram_photo_url=body.photo_url,
        )
        session.add(user)
        await session.flush()
    else:
        user.telegram_username = body.username
        user.telegram_first_name = body.first_name
        user.telegram_last_name = body.last_name
        user.telegram_photo_url = body.photo_url

    if body.reg_session_id is not None:
        reg_result = await session.execute(
            select(RegistrationSession).where(
                RegistrationSession.id == body.reg_session_id,
                RegistrationSession.status == "pending",
            )
        )
        reg_session = reg_result.scalars().first()
        if reg_session is not None:
            reg_session.attached_user_id = user.id
            reg_session.status = "attached"

    await session.commit()

    access = create_access_token(str(user.id), "client")
    refresh = create_refresh_token(str(user.id), "client")

    return ClientAuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserBrief.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid refresh token")

    if payload.get("type") != "refresh" or payload.get("role") != "client":
        raise HTTPException(status_code=401, detail="invalid refresh token")

    subject = payload["sub"]
    access = create_access_token(subject, "client")
    refresh = create_refresh_token(subject, "client")

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=200)
async def logout() -> dict:
    return {"ok": True}
