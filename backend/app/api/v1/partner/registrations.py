"""Partner registration session endpoints (SPEC.md §6, §14.2)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.partners import PartnerUser
from app.schemas.kyc import (
    PartnerRegisteredUserBrief,
    RegistrationSessionCreateResponse,
    RegistrationSessionStatusResponse,
)
from app.services.registration_sessions import (
    build_deep_link,
    build_qr_url,
    create_session,
    get_session_status,
)

router = APIRouter(prefix="/registrations", tags=["partner-registrations"])


@router.post("", response_model=RegistrationSessionCreateResponse)
async def create_registration(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> RegistrationSessionCreateResponse:
    reg = await create_session(session, partner_user)
    await session.commit()

    return RegistrationSessionCreateResponse(
        session_id=reg.id,
        qr_url=build_qr_url(reg.id),
        deep_link=build_deep_link(reg.id),
    )


@router.get("/{session_id}/status", response_model=RegistrationSessionStatusResponse)
async def registration_status(
    session_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> RegistrationSessionStatusResponse:
    reg = await get_session_status(session, session_id)
    if not reg:
        raise HTTPException(404, "registration session not found")
    if reg.partner_id != partner_user.partner_id:
        raise HTTPException(403, "session belongs to another partner")

    user_brief = None
    if reg.status == "attached" and reg.attached_user_id:
        from sqlalchemy import select
        from app.models.users import User

        result = await session.execute(
            select(User).where(User.id == reg.attached_user_id)
        )
        user = result.scalars().first()
        if user:
            user_brief = PartnerRegisteredUserBrief(
                id=user.id,
                telegram_id=user.telegram_id,
                telegram_first_name=user.telegram_first_name,
                telegram_last_name=user.telegram_last_name,
                telegram_photo_url=user.telegram_photo_url,
                kyc_status=user.kyc_status,
            )

    return RegistrationSessionStatusResponse(
        status=reg.status,
        user=user_brief,
    )
