"""Email for YooKassa receipts (54-FZ)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.users import User

router = APIRouter(tags=["client-email"])


class SetEmailRequest(BaseModel):
    email: EmailStr


class EmailResponse(BaseModel):
    email: str


@router.post("/me/email", response_model=EmailResponse)
async def set_email(
    body: SetEmailRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> EmailResponse:
    user.email = body.email
    await session.commit()
    return EmailResponse(email=body.email)
