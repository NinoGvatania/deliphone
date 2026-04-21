from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.ops import SupportChat, SupportMessage
from app.models.users import User
from datetime import UTC, datetime

router = APIRouter(prefix="/support", tags=["client-support"])

@router.get("/chats")
async def list_chats(user: User = Depends(get_current_client), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(SupportChat).where(SupportChat.user_id == user.id).order_by(SupportChat.created_at.desc()))
    chats = result.scalars().all()
    return [{"id": str(c.id), "subject": c.subject, "status": c.status, "created_at": str(c.created_at)} for c in chats]

@router.post("/chats")
async def create_chat(user: User = Depends(get_current_client), session: AsyncSession = Depends(get_session)):
    chat = SupportChat(user_id=user.id, subject="Обращение в поддержку", status="open")
    session.add(chat)
    await session.flush()
    await session.commit()
    return {"id": str(chat.id), "subject": chat.subject, "status": chat.status}

@router.get("/chats/{chat_id}/messages")
async def get_messages(chat_id: str, user: User = Depends(get_current_client), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(SupportMessage).where(SupportMessage.chat_id == chat_id).order_by(SupportMessage.created_at.asc()))
    msgs = result.scalars().all()
    return [{"id": str(m.id), "sender_type": m.sender_type, "content": m.content, "created_at": str(m.created_at)} for m in msgs]

@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: dict, user: User = Depends(get_current_client), session: AsyncSession = Depends(get_session)):
    msg = SupportMessage(chat_id=chat_id, sender_type="user", sender_id=user.id, content=body.get("content", ""))
    session.add(msg)
    await session.commit()
    return {"id": str(msg.id), "sent": True}
