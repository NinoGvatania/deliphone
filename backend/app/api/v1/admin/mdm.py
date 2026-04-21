"""Admin MDM endpoints for device management commands."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.android_mdm import get_mdm_client

router = APIRouter(tags=["admin-mdm"])


class EnrollRequest(BaseModel):
    policy_id: str = "normal_policy"
    duration: str = "3600s"


class CommandRequest(BaseModel):
    command: Literal["lock", "reboot", "reset_password"]


class EnrollResponse(BaseModel):
    token: str | None = None
    qr_code: str | None = None
    raw: dict


class CommandResponse(BaseModel):
    status: str
    result: dict


class HealthResponse(BaseModel):
    status: str
    enterprise_name: str | None = None
    display_name: str | None = None
    error: str | None = None


@router.post("/devices/{device_id}/mdm/enroll", response_model=EnrollResponse)
async def create_enrollment_token(device_id: str, body: EnrollRequest):
    client = get_mdm_client()
    try:
        result = await client.create_enrollment_token(body.policy_id, body.duration)
        return EnrollResponse(
            token=result.get("value"),
            qr_code=result.get("qrCode"),
            raw=result,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MDM API error: {e}")


@router.post("/devices/{device_id}/mdm/command", response_model=CommandResponse)
async def issue_device_command(device_id: str, body: CommandRequest):
    from sqlalchemy import select
    from app.core.db import _get_session_factory
    from app.models.catalog import Device

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()
        if not device:
            raise HTTPException(404, "Device not found")
        if not device.mdm_device_name:
            raise HTTPException(400, "Device not enrolled in MDM")

        client = get_mdm_client()
        try:
            if body.command == "lock":
                resp = await client.lock_device(device.mdm_device_name)
            elif body.command == "reboot":
                resp = await client.reboot_device(device.mdm_device_name)
            elif body.command == "reset_password":
                resp = await client.reset_password(device.mdm_device_name)
            else:
                raise HTTPException(400, "Unknown command")
            return CommandResponse(status="ok", result=resp)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"MDM API error: {e}")


@router.post("/devices/{device_id}/mdm/wipe", response_model=CommandResponse)
async def wipe_device(device_id: str):
    from sqlalchemy import select
    from app.core.db import _get_session_factory
    from app.models.catalog import Device

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()
        if not device:
            raise HTTPException(404, "Device not found")
        if not device.mdm_device_name:
            raise HTTPException(400, "Device not enrolled in MDM")

        client = get_mdm_client()
        try:
            resp = await client.wipe_device(device.mdm_device_name)
            return CommandResponse(status="ok", result=resp)
        except Exception as e:
            raise HTTPException(502, f"MDM API error: {e}")


@router.get("/devices/{device_id}/mdm/status")
async def get_device_mdm_status(device_id: str):
    from sqlalchemy import select
    from app.core.db import _get_session_factory
    from app.models.catalog import Device

    factory = _get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()
        if not device:
            raise HTTPException(404, "Device not found")
        if not device.mdm_device_name:
            return {"enrolled": False}

        client = get_mdm_client()
        try:
            return await client.get_device(device.mdm_device_name)
        except Exception as e:
            raise HTTPException(502, f"MDM API error: {e}")


@router.get("/mdm/health", response_model=HealthResponse)
async def mdm_health():
    client = get_mdm_client()
    result = await client.health_check()
    return HealthResponse(**result)
