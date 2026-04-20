"""Admin support/chat endpoints (SPEC §7, §14.3).

Queue with Udobno priority: active subscribers get priority=high.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.db import get_session
from app.core.deps import get_current_admin
from app.models.admin import AdminUser
from app.models.ops import SupportChat, SupportMessage
from app.models.users import Subscription, User

router = APIRouter(prefix="/support", tags=["admin-support"])


# ---------- schemas ----------


class QueueChatItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    partner_user_id: uuid.UUID | None = None
    user_name: str | None = None
    subject: str | None = None
    status: str
    priority: str
    assigned_admin_id: uuid.UUID | None = None
    last_message_preview: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ChatDetail(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    partner_user_id: uuid.UUID | None = None
    subject: str | None = None
    status: str
    priority: str
    assigned_admin_id: uuid.UUID | None = None
    created_at: datetime
    messages: list["MessageItem"] = []

    model_config = {"from_attributes": True}


class MessageItem(BaseModel):
    id: uuid.UUID
    sender_type: str | None = None
    sender_id: uuid.UUID | None = None
    content: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str


# ---------- endpoints ----------


@router.get("/queues", response_model=list[QueueChatItem])
async def list_queues(
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[QueueChatItem]:
    """All open chats sorted by priority (high first = Udobno subscribers)."""
    result = await session.execute(
        select(SupportChat)
        .where(SupportChat.status.in_(["open", "in_progress"]))
        .order_by(SupportChat.priority.desc(), SupportChat.created_at.asc())
    )
    chats = result.scalars().all()

    # Enrich with user subscription status
    items: list[QueueChatItem] = []
    for chat in chats:
        priority = chat.priority
        user_name: str | None = None

        if chat.user_id:
            user_result = await session.execute(
                select(User).where(User.id == chat.user_id)
            )
            user = user_result.scalars().first()
            if user:
                user_name = user.telegram_first_name or user.telegram_username
                # Check Udobno subscription
                sub_result = await session.execute(
                    select(Subscription).where(
                        Subscription.user_id == user.id,
                        Subscription.status == "active",
                    )
                )
                sub = sub_result.scalars().first()
                if sub:
                    priority = "high"

        # Last message preview
        msg_result = await session.execute(
            select(SupportMessage)
            .where(SupportMessage.chat_id == chat.id)
            .order_by(SupportMessage.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalars().first()

        items.append(
            QueueChatItem(
                id=chat.id,
                user_id=chat.user_id,
                partner_user_id=chat.partner_user_id,
                user_name=user_name,
                subject=chat.subject,
                status=chat.status,
                priority=priority,
                assigned_admin_id=chat.assigned_admin_id,
                last_message_preview=(
                    last_msg.content[:100] if last_msg and last_msg.content else None
                ),
                updated_at=last_msg.created_at if last_msg else chat.created_at,
            )
        )

    # Sort again after enrichment (subscription may have upgraded priority)
    items.sort(key=lambda x: (0 if x.priority == "high" else 1, x.updated_at or datetime.min.replace(tzinfo=timezone.utc)))
    return items


@router.get("/chats/{chat_id}", response_model=ChatDetail)
async def get_chat(
    chat_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> ChatDetail:
    """Full chat with all messages."""
    result = await session.execute(
        select(SupportChat).where(SupportChat.id == chat_id)
    )
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "chat not found")

    msg_result = await session.execute(
        select(SupportMessage)
        .where(SupportMessage.chat_id == chat.id)
        .order_by(SupportMessage.created_at.asc())
    )
    messages = msg_result.scalars().all()

    return ChatDetail(
        id=chat.id,
        user_id=chat.user_id,
        partner_user_id=chat.partner_user_id,
        subject=chat.subject,
        status=chat.status,
        priority=chat.priority,
        assigned_admin_id=chat.assigned_admin_id,
        created_at=chat.created_at,
        messages=[
            MessageItem(
                id=m.id,
                sender_type=m.sender_type,
                sender_id=m.sender_id,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.post("/chats/{chat_id}/assign")
async def assign_chat(
    chat_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Assign chat to current admin."""
    result = await session.execute(
        select(SupportChat).where(SupportChat.id == chat_id)
    )
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "chat not found")

    chat.assigned_admin_id = admin.id
    chat.status = "in_progress"
    await session.commit()
    return {"ok": True}


@router.post("/chats/{chat_id}/close")
async def close_chat(
    chat_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Close a support chat."""
    result = await session.execute(
        select(SupportChat).where(SupportChat.id == chat_id)
    )
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "chat not found")

    chat.status = "closed"
    chat.closed_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}


@router.post("/chats/{chat_id}/messages", response_model=MessageItem)
async def send_message(
    chat_id: uuid.UUID,
    body: SendMessageRequest,
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> MessageItem:
    """Admin sends a message in the chat."""
    result = await session.execute(
        select(SupportChat).where(SupportChat.id == chat_id)
    )
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "chat not found")

    message = SupportMessage(
        chat_id=chat.id,
        sender_type="admin",
        sender_id=admin.id,
        content=body.content,
    )
    session.add(message)
    await session.flush()

    item = MessageItem(
        id=message.id,
        sender_type=message.sender_type,
        sender_id=message.sender_id,
        content=message.content,
        created_at=message.created_at,
    )
    await session.commit()
    return item
