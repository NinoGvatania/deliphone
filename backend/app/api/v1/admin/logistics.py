"""Admin logistics endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.catalog import Device, DeviceMovement
from app.models.partners import PartnerLocation
from app.schemas.admin import LogisticsLocationData, MovementListItem

router = APIRouter(prefix="/logistics", tags=["admin-logistics"])


@router.get("", response_model=list[LogisticsLocationData])
async def logistics_map(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[LogisticsLocationData]:
    result = await session.execute(
        select(
            PartnerLocation.id,
            PartnerLocation.name,
            PartnerLocation.city,
            PartnerLocation.capacity,
            func.count(Device.id).label("device_count"),
        )
        .outerjoin(Device, Device.current_location_id == PartnerLocation.id)
        .where(PartnerLocation.status == "active")
        .group_by(PartnerLocation.id)
    )
    rows = result.all()

    items = []
    for row in rows:
        device_count = row.device_count or 0
        capacity = row.capacity or 10
        items.append(LogisticsLocationData(
            id=row.id,
            name=row.name,
            city=row.city,
            device_count=device_count,
            capacity=capacity,
            surplus=device_count - capacity,
        ))
    return items


@router.get("/movements", response_model=list[MovementListItem])
async def list_movements(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[MovementListItem]:
    offset = (page - 1) * size
    result = await session.execute(
        select(DeviceMovement)
        .order_by(DeviceMovement.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    movements = result.scalars().all()
    return [MovementListItem.model_validate(m) for m in movements]
