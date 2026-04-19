"""Admin auth endpoints — email + password + mandatory TOTP 2FA (SPEC §14.3, §7.2)."""

from __future__ import annotations

from datetime import UTC, datetime

import pyotp
from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.rate_limit import rate_limit_2fa, rate_limit_admin_login
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_temp_2fa_token,
    decode_token,
    verify_password,
)
from app.models.admin import AdminUser
from app.schemas.auth import (
    AdminAuthResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserBrief,
    AdminVerify2FARequest,
)

router = APIRouter(prefix="/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminLoginResponse, dependencies=[Depends(rate_limit_admin_login)])
async def admin_login(
    body: AdminLoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AdminLoginResponse:
    result = await session.execute(
        select(AdminUser).where(AdminUser.email == body.email)
    )
    admin = result.scalars().first()

    if admin is None or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    temp_token = create_temp_2fa_token(str(admin.id))

    return AdminLoginResponse(temp_token=temp_token)


@router.post("/verify-2fa", response_model=AdminAuthResponse, dependencies=[Depends(rate_limit_2fa)])
async def verify_2fa(
    body: AdminVerify2FARequest,
    session: AsyncSession = Depends(get_session),
) -> AdminAuthResponse:
    try:
        payload = decode_token(body.temp_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid or expired temp token")

    if payload.get("type") != "temp_2fa":
        raise HTTPException(status_code=401, detail="invalid or expired temp token")

    admin_id = payload["sub"]

    result = await session.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    admin = result.scalars().first()

    if admin is None:
        raise HTTPException(status_code=401, detail="invalid or expired temp token")

    totp = pyotp.TOTP(admin.totp_secret)
    if not totp.verify(body.totp_code, valid_window=1):
        raise HTTPException(status_code=401, detail="invalid TOTP code")

    async with session.begin():
        admin.last_login_at = datetime.now(UTC)

    access = create_access_token(
        str(admin.id), "admin", extra_claims={"admin_role": admin.role}
    )
    refresh = create_refresh_token(str(admin.id), "admin")

    return AdminAuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=AdminUserBrief.model_validate(admin),
    )
