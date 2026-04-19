"""Client /me endpoint — returns current user profile (SPEC §14.1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_current_client
from app.models.users import User
from app.schemas.auth import UserBrief

router = APIRouter(tags=["client-me"])


@router.get("/me", response_model=UserBrief)
async def get_me(user: User = Depends(get_current_client)) -> UserBrief:
    return UserBrief.model_validate(user)
