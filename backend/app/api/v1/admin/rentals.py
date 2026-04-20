"""Admin rental management endpoints (SPEC §7, §14.3)."""

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
from app.models.rentals import Rental
from app.schemas.admin import (
    RentalDiscountRequest,
    RentalExtendRequest,
    RentalListItem,
    RentalListResponse,
    RentalTimeline,
)

router = APIRouter(prefix="/rentals", tags=["admin-rentals"])


@router.get("", response_model=RentalListResponse)
async def list_rentals(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    device_id: uuid.UUID | None = Query(None),
    location_id: uuid.UUID | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> RentalListResponse:
    base = select(Rental)
    count_q = select(func.count()).select_from(Rental)

    if status:
        base = base.where(Rental.status == status)
        count_q = count_q.where(Rental.status == status)
    if user_id:
        base = base.where(Rental.user_id == user_id)
        count_q = count_q.where(Rental.user_id == user_id)
    if device_id:
        base = base.where(Rental.device_id == device_id)
        count_q = count_q.where(Rental.device_id == device_id)
    if location_id:
        base = base.where(Rental.issued_at_location_id == location_id)
        count_q = count_q.where(Rental.issued_at_location_id == location_id)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Rental.created_at.desc()).offset(offset).limit(size))
    rentals = result.scalars().all()

    return RentalListResponse(
        items=[RentalListItem.model_validate(r) for r in rentals],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{rental_id}", response_model=RentalTimeline)
async def get_rental(
    rental_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> RentalTimeline:
    result = await session.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")
    return RentalTimeline.model_validate(rental)


@router.post("/{rental_id}/extend")
async def extend_rental(
    rental_id: uuid.UUID,
    body: RentalExtendRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")

    old_paid_until = rental.paid_until
    rental.paid_until = body.paid_until
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="rental.extend",
        entity_type="rental",
        entity_id=rental.id,
        changes={"old_paid_until": str(old_paid_until), "new_paid_until": str(body.paid_until)},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "extended", "paid_until": str(rental.paid_until)}


@router.post("/{rental_id}/apply-discount")
async def apply_discount(
    rental_id: uuid.UUID,
    body: RentalDiscountRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="rental.apply_discount",
        entity_type="rental",
        entity_id=rental.id,
        changes={"discount_amount": body.discount_amount, "reason": body.reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "discount_applied"}


@router.post("/{rental_id}/close-force")
async def close_force(
    rental_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")

    rental.status = "closed"
    rental.closed_at = datetime.now(UTC)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="rental.close_force",
        entity_type="rental",
        entity_id=rental.id,
        changes={"status": "closed"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "closed"}
