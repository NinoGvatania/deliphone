"""Partner device return wizard endpoints (SPEC §6, §14.2)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.catalog import Device
from app.models.partners import PartnerLocation, PartnerUser
from app.models.rentals import Incident, Rental
from app.models.users import User
from app.schemas.partner import (
    ReturnChecklistRequest,
    ReturnCreateIncidentRequest,
    ReturnFrpCheckRequest,
    ReturnInitRequest,
    ReturnSanitizationRequest,
    ReturnSessionResponse,
)

router = APIRouter(prefix="/returns", tags=["partner-returns"])

# In-memory return sessions (replace with DB/Redis in production)
_return_sessions: dict[uuid.UUID, dict] = {}


async def _find_device(
    body: ReturnInitRequest, session: AsyncSession
) -> Device:
    if not body.device_qr and not body.imei:
        raise HTTPException(422, "device_qr or imei required")

    if body.device_qr:
        try:
            device_id = uuid.UUID(body.device_qr)
        except ValueError:
            raise HTTPException(422, "invalid device_qr format")
        result = await session.execute(select(Device).where(Device.id == device_id))
    else:
        result = await session.execute(select(Device).where(Device.imei == body.imei))

    device = result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")
    return device


def _get_return_session(session_id: uuid.UUID) -> dict:
    rs = _return_sessions.get(session_id)
    if not rs:
        raise HTTPException(404, "return session not found")
    return rs


@router.post("/init", response_model=ReturnSessionResponse)
async def return_init(
    body: ReturnInitRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> ReturnSessionResponse:
    device = await _find_device(body, session)

    # Find active rental for this device
    result = await session.execute(
        select(Rental).where(
            Rental.device_id == device.id,
            Rental.status == "active",
        )
    )
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "no active rental found for this device")

    # Load user
    user_result = await session.execute(select(User).where(User.id == rental.user_id))
    user = user_result.scalars().first()
    user_name = (user.full_name or user.telegram_first_name or "Unknown") if user else "Unknown"

    session_id = uuid.uuid4()
    qr_url = f"https://app.deliphone.ru/return/{session_id}"

    _return_sessions[session_id] = {
        "session_id": session_id,
        "rental_id": rental.id,
        "device_id": device.id,
        "partner_user_id": partner_user.id,
        "partner_id": partner_user.partner_id,
        "status": "initiated",
        "checklist": None,
        "incidents": [],
        "frp_cleared": None,
        "sanitization_done": False,
    }

    return ReturnSessionResponse(
        session_id=session_id,
        qr_url=qr_url,
        rental_id=rental.id,
        user_name=user_name,
        device_model=device.model,
        device_short_code=device.short_code,
        activated_at=rental.activated_at,
        paid_until=rental.paid_until,
    )


@router.get("/{session_id}/qr")
async def return_qr(
    session_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
) -> dict:
    rs = _get_return_session(session_id)
    return {"qr_url": f"https://app.deliphone.ru/return/{session_id}"}


@router.get("/{session_id}/status")
async def return_status(
    session_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
) -> dict:
    rs = _get_return_session(session_id)
    return {"status": rs["status"], "session_id": str(session_id)}


@router.post("/{session_id}/frp-check")
async def frp_check(
    session_id: uuid.UUID,
    body: ReturnFrpCheckRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rs = _get_return_session(session_id)
    rs["frp_cleared"] = body.frp_cleared

    if not body.frp_cleared:
        # Create FRP locked incident
        incident = Incident(
            rental_id=rs["rental_id"],
            device_id=rs["device_id"],
            partner_id=rs["partner_id"],
            type="frp_locked",
            status="open",
            severity="high",
            reported_by="partner",
            reported_by_id=partner_user.id,
            description="Device FRP lock not cleared during return",
        )
        session.add(incident)
        await session.commit()
        rs["incidents"].append(str(incident.id))
        return {"ok": True, "frp_cleared": False, "incident_created": True}

    return {"ok": True, "frp_cleared": True}


@router.post("/{session_id}/checklist")
async def checklist(
    session_id: uuid.UUID,
    body: ReturnChecklistRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
) -> dict:
    rs = _get_return_session(session_id)
    rs["checklist"] = body.items
    rs["status"] = "checklist_done"
    return {"ok": True}


@router.post("/{session_id}/create-incident")
async def create_incident(
    session_id: uuid.UUID,
    body: ReturnCreateIncidentRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rs = _get_return_session(session_id)

    incident = Incident(
        rental_id=rs["rental_id"],
        device_id=rs["device_id"],
        partner_id=rs["partner_id"],
        type="damage",
        status="open",
        severity="medium",
        reported_by="partner",
        reported_by_id=partner_user.id,
        damage_category=body.category,
        damage_subcategory=body.subcategory,
        photo_urls=body.photo_urls,
        client_charge=body.proposed_amount,
    )
    session.add(incident)
    await session.commit()

    rs["incidents"].append(str(incident.id))

    return {"ok": True, "incident_id": str(incident.id)}


@router.post("/{session_id}/sanitization")
async def sanitization(
    session_id: uuid.UUID,
    body: ReturnSanitizationRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
) -> dict:
    rs = _get_return_session(session_id)
    rs["sanitization_done"] = body.checklist_done
    rs["sanitization_photo"] = body.photo_url
    rs["status"] = "sanitization_done"
    return {"ok": True}


@router.post("/{session_id}/finalize")
async def finalize_return(
    session_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rs = _get_return_session(session_id)

    # Close rental
    result = await session.execute(select(Rental).where(Rental.id == rs["rental_id"]))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")

    now = datetime.now(UTC)
    rental.status = "closed"
    rental.closed_at = now
    rental.returning_partner_user_id = partner_user.id

    # Release device custody back to location
    device_result = await session.execute(
        select(Device).where(Device.id == rs["device_id"])
    )
    device = device_result.scalars().first()
    if device:
        device.current_custody = "location"
        device.current_rental_id = None

    # TODO: release deposit hold via payment provider

    await session.commit()

    rs["status"] = "finalized"
    _return_sessions.pop(session_id, None)

    return {"ok": True, "status": "closed", "closed_at": now.isoformat()}
