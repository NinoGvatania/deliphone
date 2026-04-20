"""Admin service/repair management endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.catalog import Device
from app.models.ops import AuditLog
from app.schemas.admin import ServiceDeviceItem, ServiceStatusUpdateRequest

router = APIRouter(prefix="/service", tags=["admin-service"])


@router.get("", response_model=list[ServiceDeviceItem])
async def list_service_devices(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[ServiceDeviceItem]:
    result = await session.execute(
        select(Device).where(Device.status == "in_service")
    )
    devices = result.scalars().all()
    return [ServiceDeviceItem.model_validate(d) for d in devices]


@router.post("/{device_id}/update-status")
async def update_service_status(
    device_id: uuid.UUID,
    body: ServiceStatusUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    old_status = device.status
    device.status = body.status
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="service.update_status",
        entity_type="device",
        entity_id=device.id,
        changes={"old_status": old_status, "new_status": body.status, "notes": body.notes},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": body.status}
