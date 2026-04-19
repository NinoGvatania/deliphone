"""YooKassa webhook handlers with HMAC verification and idempotent processing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.rentals import Payment
from app.models.webhooks import WebhookEvent
from app.services.yookassa import get_yookassa

router = APIRouter(prefix="/yookassa", tags=["webhooks"])


@router.post("/payment.succeeded")
@router.post("/payment.waiting_for_capture")
@router.post("/payment.canceled")
@router.post("/refund.succeeded")
async def handle_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    body = await request.body()

    yookassa = get_yookassa()
    signature = request.headers.get("X-Signature", "")
    if yookassa.webhook_secret and not yookassa.verify_webhook_signature(body, signature):
        raise HTTPException(401, "invalid webhook signature")

    data = await request.json()
    event_id = data.get("event_id") or data.get("object", {}).get("id", "")
    event_type = data.get("event", "unknown")

    existing = await session.execute(
        select(WebhookEvent).where(WebhookEvent.provider_event_id == event_id)
    )
    if existing.scalars().first():
        return {"status": "already_processed"}

    session.add(WebhookEvent(
        provider_event_id=event_id,
        event_type=event_type,
        payload=data,
    ))

    payment_obj = data.get("object", {})
    payment_id = payment_obj.get("id")

    if payment_id:
        result = await session.execute(
            select(Payment).where(Payment.provider_payment_id == payment_id)
        )
        payment = result.scalars().first()
        if payment:
            payment.provider_status = payment_obj.get("status")
            if event_type == "payment.succeeded":
                payment.captured_at = payment_obj.get("captured_at")
            elif event_type == "refund.succeeded":
                payment.refunded_at = payment_obj.get("created_at")

    await session.commit()
    return {"status": "ok"}
