"""Partner inventory endpoints (SPEC §6, §14.2)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.catalog import Device
from app.models.ops import InventoryAudit
from app.models.partners import PartnerLocation, PartnerUser
from app.schemas.partner import (
    InventoryDeviceBrief,
    InventoryListResponse,
    InventoryScanRequest,
)

router = APIRouter(prefix="/inventory", tags=["partner-inventory"])


@router.get("", response_model=InventoryListResponse)
async def list_inventory(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> InventoryListResponse:
    loc_ids_q = select(PartnerLocation.id).where(
        PartnerLocation.partner_id == partner_user.partner_id
    )

    result = await session.execute(
        select(Device).where(Device.current_location_id.in_(loc_ids_q))
    )
    devices = result.scalars().all()

    now = datetime.now(UTC)
    briefs = []
    for d in devices:
        days = 0
        if d.last_moved_at:
            days = (now - d.last_moved_at).days
        briefs.append(
            InventoryDeviceBrief(
                id=d.id,
                imei_last4=d.imei[-4:] if d.imei else "????",
                model=d.model,
                short_code=d.short_code,
                custody=d.current_custody,
                days_on_point=days,
            )
        )

    return InventoryListResponse(devices=briefs, total=len(briefs))


@router.post("/audit/{audit_id}/scan")
async def audit_scan(
    audit_id: uuid.UUID,
    body: InventoryScanRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(InventoryAudit).where(InventoryAudit.id == audit_id)
    )
    audit = result.scalars().first()
    if not audit:
        raise HTTPException(404, "audit not found")
    if audit.partner_id != partner_user.partner_id:
        raise HTTPException(403, "audit belongs to another partner")
    if audit.status not in ("scheduled", "in_progress"):
        raise HTTPException(409, "audit is not active")

    if not body.device_qr and not body.imei:
        raise HTTPException(422, "device_qr or imei required")

    # Find device
    if body.device_qr:
        try:
            device_id = uuid.UUID(body.device_qr)
        except ValueError:
            raise HTTPException(422, "invalid device_qr format")
        dev_result = await session.execute(select(Device).where(Device.id == device_id))
    else:
        dev_result = await session.execute(
            select(Device).where(Device.imei == body.imei)
        )
    device = dev_result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    # Mark as found
    audit.status = "in_progress"
    if audit.started_at is None:
        audit.started_at = datetime.now(UTC)

    found = audit.found_devices or []
    device_id_str = str(device.id)
    if device_id_str not in found:
        found.append(device_id_str)
    audit.found_devices = found
    await session.commit()

    return {"ok": True, "device_id": device_id_str, "found_total": len(found)}


@router.post("/audit/{audit_id}/complete")
async def audit_complete(
    audit_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(InventoryAudit).where(InventoryAudit.id == audit_id)
    )
    audit = result.scalars().first()
    if not audit:
        raise HTTPException(404, "audit not found")
    if audit.partner_id != partner_user.partner_id:
        raise HTTPException(403, "audit belongs to another partner")

    now = datetime.now(UTC)
    audit.status = "completed"
    audit.completed_at = now

    # Calculate missing devices
    expected = set(audit.expected_devices or [])
    found = set(audit.found_devices or [])
    missing = list(expected - found)
    audit.missing_devices = missing

    await session.commit()

    return {
        "ok": True,
        "expected": len(expected),
        "found": len(found),
        "missing": len(missing),
        "missing_device_ids": missing,
    }
