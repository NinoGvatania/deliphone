"""Admin subscription management endpoints (SPEC §14.3)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog
from app.models.users import Subscription
from app.schemas.admin import SubscriptionListItem, SubscriptionListResponse

router = APIRouter(prefix="/subscriptions", tags=["admin-subscriptions"])


@router.get("", response_model=SubscriptionListResponse)
async def list_subscriptions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> SubscriptionListResponse:
    base = select(Subscription)
    count_q = select(func.count()).select_from(Subscription)

    if status:
        base = base.where(Subscription.status == status)
        count_q = count_q.where(Subscription.status == status)

    total = (await session.execute(count_q)).scalar() or 0

    total_revenue = float((await session.execute(
        select(func.coalesce(func.sum(Subscription.total_paid), 0))
    )).scalar() or 0)

    offset = (page - 1) * size
    result = await session.execute(base.order_by(Subscription.created_at.desc()).offset(offset).limit(size))
    subs = result.scalars().all()

    return SubscriptionListResponse(
        items=[SubscriptionListItem.model_validate(s) for s in subs],
        total=total,
        page=page,
        size=size,
        total_revenue=total_revenue,
    )


@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(404, "subscription not found")

    sub.status = "cancelled"
    sub.cancelled_at = datetime.now(UTC)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="subscription.cancel",
        entity_type="subscription",
        entity_id=sub.id,
        changes={"status": "cancelled"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "cancelled"}
