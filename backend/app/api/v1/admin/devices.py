"""Admin device management endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.catalog import Device, DeviceMovement
from app.models.ops import AuditLog
from app.schemas.admin import (
    DeviceCreateRequest,
    DeviceDetail,
    DeviceListItem,
    DeviceListResponse,
    DeviceMoveRequest,
    DeviceUpdateRequest,
)

router = APIRouter(prefix="/devices", tags=["admin-devices"])


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    custody: str | None = Query(None),
    location_id: uuid.UUID | None = Query(None),
    model: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> DeviceListResponse:
    base = select(Device)
    count_q = select(func.count()).select_from(Device)

    if status:
        base = base.where(Device.status == status)
        count_q = count_q.where(Device.status == status)
    if custody:
        base = base.where(Device.current_custody == custody)
        count_q = count_q.where(Device.current_custody == custody)
    if location_id:
        base = base.where(Device.current_location_id == location_id)
        count_q = count_q.where(Device.current_location_id == location_id)
    if model:
        base = base.where(Device.model.ilike(f"%{model}%"))
        count_q = count_q.where(Device.model.ilike(f"%{model}%"))

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Device.created_at.desc()).offset(offset).limit(size))
    devices = result.scalars().all()

    return DeviceListResponse(
        items=[DeviceListItem.model_validate(d) for d in devices],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=DeviceDetail)
async def create_device(
    body: DeviceCreateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> DeviceDetail:
    device = Device(
        imei=body.imei,
        model=body.model,
        serial_number=body.serial_number,
        short_code=body.short_code,
        color=body.color,
        storage=body.storage,
        condition_grade=body.condition_grade,
        purchase_cost=body.purchase_cost,
        purchase_date=body.purchase_date,
        current_location_id=body.current_location_id,
        current_custody="partner" if body.current_location_id else None,
        reference_photos=body.reference_photos,
        status="active",
    )
    session.add(device)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="device.create",
        entity_type="device",
        entity_id=device.id,
        changes=body.model_dump(),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(device)
    return DeviceDetail.model_validate(device)


@router.get("/{device_id}", response_model=DeviceDetail)
async def get_device(
    device_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> DeviceDetail:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")
    return DeviceDetail.model_validate(device)


@router.patch("/{device_id}", response_model=DeviceDetail)
async def update_device(
    device_id: uuid.UUID,
    body: DeviceUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> DeviceDetail:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
        changes[field] = value

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="device.update",
        entity_type="device",
        entity_id=device.id,
        changes=changes,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(device)
    return DeviceDetail.model_validate(device)


@router.post("/{device_id}/move")
async def move_device(
    device_id: uuid.UUID,
    body: DeviceMoveRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    from_loc = device.current_location_id
    device.current_location_id = body.to_location_id
    device.last_moved_at = datetime.now(UTC)

    movement = DeviceMovement(
        device_id=device.id,
        from_location_id=from_loc,
        to_location_id=body.to_location_id,
        movement_type="admin_transfer",
        initiated_by_type="admin",
        initiated_by_id=admin.id,
        status="completed",
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        notes=body.notes,
    )
    session.add(movement)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="device.move",
        entity_type="device",
        entity_id=device.id,
        changes={"from": str(from_loc), "to": str(body.to_location_id)},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "moved"}


@router.post("/{device_id}/to-service")
async def device_to_service(
    device_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    device.status = "in_service"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="device.to_service",
        entity_type="device",
        entity_id=device.id,
        changes={"status": "in_service"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "in_service"}


@router.post("/{device_id}/write-off")
async def write_off_device(
    device_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Device).where(Device.id == device_id))
    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    device.status = "written_off"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="device.write_off",
        entity_type="device",
        entity_id=device.id,
        changes={"status": "written_off"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "written_off"}
