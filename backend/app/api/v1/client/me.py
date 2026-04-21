"""Client /me endpoint — profile read + update."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.users import User
from app.schemas.auth import UserBrief

router = APIRouter(tags=["client-me"])


class UpdateProfileRequest(BaseModel):
    first_name: str | None = None
    email: str | None = None


@router.get("/me", response_model=UserBrief)
async def get_me(user: User = Depends(get_current_client)) -> UserBrief:
    return UserBrief.model_validate(user)


@router.post("/me/update", response_model=UserBrief)
async def update_me(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> UserBrief:
    if body.first_name and body.first_name.strip():
        user.first_name = body.first_name.strip()
    if body.email is not None:
        user.email = body.email.strip() if body.email.strip() else None
    await session.commit()
    return UserBrief.model_validate(user)
