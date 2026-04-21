"""Partner device issuance wizard endpoints (SPEC §6, §14.2)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.catalog import Device
from app.models.partners import PartnerLocation, PartnerUser
from app.models.rentals import Payment, Rental
from app.models.users import User
from app.schemas.partner import (
    IssueScanDeviceRequest,
    IssueSignatureRequest,
    IssueUploadPhotosRequest,
    IssueWizardInit,
)

router = APIRouter(prefix="/bookings", tags=["partner-issues"])

DAILY_RATE = 349.00


async def _get_rental_for_partner(
    rental_id: uuid.UUID,
    partner_user: PartnerUser,
    session: AsyncSession,
) -> Rental:
    """Load rental and verify it belongs to one of the partner's locations."""
    result = await session.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalars().first()
    if not rental:
        raise HTTPException(404, "rental not found")

    loc_ids_q = select(PartnerLocation.id).where(
        PartnerLocation.partner_id == partner_user.partner_id
    )
    loc_ids = (await session.execute(loc_ids_q)).scalars().all()
    if rental.issued_at_location_id not in loc_ids:
        raise HTTPException(403, "rental does not belong to this partner's location")
    return rental


@router.post("/scan-client-qr", response_model=IssueWizardInit)
async def scan_client_qr(
    body: dict,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> IssueWizardInit:
    qr_token = body.get("qr_token")
    if not qr_token:
        raise HTTPException(422, "qr_token required")

    try:
        rental_id = uuid.UUID(qr_token)
    except ValueError:
        raise HTTPException(422, "invalid qr_token format")

    rental = await _get_rental_for_partner(rental_id, partner_user, session)

    if rental.status != "booked":
        raise HTTPException(409, f"rental status is '{rental.status}', expected 'booked'")

    # Load user
    user_result = await session.execute(select(User).where(User.id == rental.user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")

    # Load device
    device_result = await session.execute(
        select(Device).where(Device.id == rental.device_id)
    )
    device = device_result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    user_name = user.first_name
    user_photo = None

    return IssueWizardInit(
        rental_id=rental.id,
        user_name=user_name,
        user_photo=user_photo,
        device_model=device.model,
        device_imei=device.imei,
        device_short_code=device.short_code,
    )


@router.post("/{rental_id}/confirm-identity")
async def confirm_identity(
    rental_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rental = await _get_rental_for_partner(rental_id, partner_user, session)
    if rental.status != "booked":
        raise HTTPException(409, f"rental status is '{rental.status}', expected 'booked'")
    return {"ok": True}


@router.post("/{rental_id}/scan-device")
async def scan_device(
    rental_id: uuid.UUID,
    body: IssueScanDeviceRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rental = await _get_rental_for_partner(rental_id, partner_user, session)

    if not body.device_qr and not body.imei:
        raise HTTPException(422, "device_qr or imei required")

    # Resolve device from QR or IMEI
    if body.device_qr:
        try:
            device_id = uuid.UUID(body.device_qr)
        except ValueError:
            raise HTTPException(422, "invalid device_qr format")
        device_result = await session.execute(
            select(Device).where(Device.id == device_id)
        )
    else:
        device_result = await session.execute(
            select(Device).where(Device.imei == body.imei)
        )
    device = device_result.scalars().first()
    if not device:
        raise HTTPException(404, "device not found")

    if device.id != rental.device_id:
        raise HTTPException(409, "scanned device does not match rental device")

    return {"ok": True, "device_model": device.model, "device_short_code": device.short_code}


@router.post("/{rental_id}/upload-photos")
async def upload_photos(
    rental_id: uuid.UUID,
    body: IssueUploadPhotosRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rental = await _get_rental_for_partner(rental_id, partner_user, session)

    if len(body.photo_urls) < 6:
        raise HTTPException(422, "at least 6 photos required")

    # Store photo URLs in rental metadata (using act_issue_html as JSON for now)
    rental.act_issue_html = ",".join(body.photo_urls)
    await session.commit()

    return {"ok": True, "photos_count": len(body.photo_urls)}


@router.post("/{rental_id}/client-signature")
async def client_signature(
    rental_id: uuid.UUID,
    body: IssueSignatureRequest,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rental = await _get_rental_for_partner(rental_id, partner_user, session)
    rental.client_signature_url = body.signature_url
    await session.commit()
    return {"ok": True}


@router.post("/{rental_id}/finalize-issue")
async def finalize_issue(
    rental_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rental = await _get_rental_for_partner(rental_id, partner_user, session)

    if rental.status != "booked":
        raise HTTPException(409, f"rental status is '{rental.status}', expected 'booked'")

    now = datetime.now(UTC)
    rental.status = "active"
    rental.activated_at = now
    rental.paid_until = now + timedelta(hours=24)
    rental.next_charge_at = now + timedelta(hours=24)
    rental.issuing_partner_user_id = partner_user.id

    # Update device custody
    device_result = await session.execute(
        select(Device).where(Device.id == rental.device_id)
    )
    device = device_result.scalars().first()
    if device:
        device.current_custody = "with_client"
        device.current_rental_id = rental.id

    # Create first payment record
    payment = Payment(
        user_id=rental.user_id,
        rental_id=rental.id,
        type="daily_charge",
        amount=DAILY_RATE,
        currency="RUB",
        counts_toward_partner_commission=True,
    )
    session.add(payment)
    await session.commit()

    return {
        "ok": True,
        "status": "active",
        "activated_at": rental.activated_at.isoformat(),
        "paid_until": rental.paid_until.isoformat(),
    }
