"""Admin location management endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog
from app.models.partners import PartnerLocation
from app.schemas.admin import (
    LocationCreateRequest,
    LocationDetail,
    LocationListItem,
    LocationListResponse,
    LocationUpdateRequest,
)

router = APIRouter(prefix="/locations", tags=["admin-locations"])


@router.get("", response_model=LocationListResponse)
async def list_locations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    city: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> LocationListResponse:
    base = select(PartnerLocation)
    count_q = select(func.count()).select_from(PartnerLocation)

    if status:
        base = base.where(PartnerLocation.status == status)
        count_q = count_q.where(PartnerLocation.status == status)
    if city:
        base = base.where(PartnerLocation.city.ilike(f"%{city}%"))
        count_q = count_q.where(PartnerLocation.city.ilike(f"%{city}%"))

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(PartnerLocation.created_at.desc()).offset(offset).limit(size))
    locations = result.scalars().all()

    return LocationListResponse(
        items=[LocationListItem.model_validate(loc) for loc in locations],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=LocationDetail)
async def create_location(
    body: LocationCreateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> LocationDetail:
    location = PartnerLocation(
        partner_id=body.partner_id,
        name=body.name,
        address=body.address,
        city=body.city,
        working_hours=body.working_hours,
        contacts=body.contacts,
        photo_url=body.photo_url,
        capacity=body.capacity,
        status="active",
    )
    session.add(location)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="location.create",
        entity_type="partner_location",
        entity_id=location.id,
        changes=body.model_dump(),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(location)
    return LocationDetail.model_validate(location)


@router.patch("/{location_id}", response_model=LocationDetail)
async def update_location(
    location_id: uuid.UUID,
    body: LocationUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> LocationDetail:
    result = await session.execute(select(PartnerLocation).where(PartnerLocation.id == location_id))
    location = result.scalars().first()
    if not location:
        raise HTTPException(404, "location not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
        changes[field] = value

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="location.update",
        entity_type="partner_location",
        entity_id=location.id,
        changes=changes,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(location)
    return LocationDetail.model_validate(location)


@router.post("/{location_id}/close")
async def close_location(
    location_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(PartnerLocation).where(PartnerLocation.id == location_id))
    location = result.scalars().first()
    if not location:
        raise HTTPException(404, "location not found")

    location.status = "closed"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="location.close",
        entity_type="partner_location",
        entity_id=location.id,
        changes={"status": "closed"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "closed"}
