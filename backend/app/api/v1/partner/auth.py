"""Partner auth endpoints — email + password (SPEC §14.2)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.rate_limit import rate_limit_partner_login
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models.partners import PartnerUser
from app.schemas.auth import PartnerAuthResponse, PartnerLoginRequest, PartnerUserBrief

router = APIRouter(prefix="/auth", tags=["partner-auth"])


@router.post("/login", response_model=PartnerAuthResponse, dependencies=[Depends(rate_limit_partner_login)])
async def partner_login(
    body: PartnerLoginRequest,
    session: AsyncSession = Depends(get_session),
) -> PartnerAuthResponse:
    result = await session.execute(
        select(PartnerUser).where(PartnerUser.email == body.email)
    )
    user = result.scalars().first()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="account deactivated")

    async with session.begin():
        user.last_login_at = datetime.now(UTC)

    access = create_access_token(str(user.id), "partner")
    refresh = create_refresh_token(str(user.id), "partner")

    return PartnerAuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=PartnerUserBrief.model_validate(user),
    )
