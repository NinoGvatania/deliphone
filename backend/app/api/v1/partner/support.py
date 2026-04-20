"""Partner support/chat endpoints (SPEC §6, §14.2)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.ops import SupportChat, SupportMessage
from app.models.partners import PartnerUser
from app.schemas.partner import ChatBrief, MessageBrief, SendMessageRequest

router = APIRouter(prefix="/support", tags=["partner-support"])


@router.get("/chats", response_model=list[ChatBrief])
async def list_chats(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> list[ChatBrief]:
    result = await session.execute(
        select(SupportChat)
        .where(SupportChat.partner_user_id == partner_user.id)
        .order_by(SupportChat.created_at.desc())
    )
    chats = result.scalars().all()

    briefs = []
    for chat in chats:
        # Get last message preview
        msg_result = await session.execute(
            select(SupportMessage)
            .where(SupportMessage.chat_id == chat.id)
            .order_by(SupportMessage.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalars().first()

        briefs.append(
            ChatBrief(
                id=chat.id,
                subject=chat.subject,
                status=chat.status,
                last_message_preview=last_msg.content[:100] if last_msg and last_msg.content else None,
                updated_at=last_msg.created_at if last_msg else chat.created_at,
            )
        )

    return briefs


@router.post("/chats/{chat_id}/messages", response_model=MessageBrief)
async def send_message(
    chat_id: uuid.UUID,
    body: SendMessageRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> MessageBrief:
    result = await session.execute(
        select(SupportChat).where(SupportChat.id == chat_id)
    )
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "chat not found")
    if chat.partner_user_id != partner_user.id:
        raise HTTPException(403, "chat belongs to another user")

    message = SupportMessage(
        chat_id=chat.id,
        sender_type="partner",
        sender_id=partner_user.id,
        content=body.content,
    )
    session.add(message)
    await session.flush()

    brief = MessageBrief(
        id=message.id,
        sender_type=message.sender_type,
        content=message.content,
        created_at=message.created_at,
    )

    await session.commit()
    return brief
