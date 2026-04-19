"""Client rental endpoints (SPEC.md §14.1)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.catalog import Device, Tariff
from app.models.partners import PartnerLocation
from app.models.rentals import Incident, Payment, Rental
from app.models.users import Subscription, User
from app.schemas.rentals import (
    ConfirmPickupResponse,
    DeviceBrief,
    IncidentBrief,
    RentalBrief,
    RentalCreateRequest,
    RentalDetail,
    RentalListResponse,
)

router = APIRouter(prefix="/rentals", tags=["client-rentals"])

ACTIVE_STATUSES = {"booked", "pending_activation", "active", "paused_payment_failed", "overdue"}
HISTORY_STATUSES = {"closed", "closed_incident", "cancelled_timeout", "cancelled_manual"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _build_rental_brief(
    rental: Rental, session: AsyncSession
) -> RentalBrief:
    device_brief: DeviceBrief | None = None
    result = await session.execute(select(Device).where(Device.id == rental.device_id))
    device = result.scalars().first()
    if device:
        device_brief = DeviceBrief(
            id=device.id,
            model=device.model,
            short_code=device.short_code,
            color=device.color,
            storage=device.storage,
            condition_grade=device.condition_grade,
        )

    location_name: str | None = None
    if rental.issued_at_location_id:
        loc_result = await session.execute(
            select(PartnerLocation.name).where(
                PartnerLocation.id == rental.issued_at_location_id
            )
        )
        location_name = loc_result.scalar_one_or_none()

    return RentalBrief(
        id=rental.id,
        status=rental.status,
        device=device_brief,
        location_name=location_name,
        activated_at=rental.activated_at,
        paid_until=rental.paid_until,
        next_charge_at=rental.next_charge_at,
        deposit_amount=float(rental.deposit_amount) if rental.deposit_amount else None,
        total_charged=float(rental.total_charged),
        debt_amount=float(rental.debt_amount),
        booking_expires_at=rental.booking_expires_at,
    )


async def _build_rental_detail(
    rental: Rental, session: AsyncSession
) -> RentalDetail:
    brief = await _build_rental_brief(rental, session)
    return RentalDetail(
        **brief.model_dump(),
        created_at=rental.created_at,
        closed_at=rental.closed_at,
        has_udobno_at_booking=rental.has_udobno_at_booking,
    )


@router.post("", response_model=RentalDetail, status_code=201)
async def create_rental(
    body: RentalCreateRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> RentalDetail:
    if user.kyc_status != "approved":
        raise HTTPException(403, "KYC not approved")

    # Check default payment method
    default_pm = next(
        (pm for pm in user.payment_methods if pm.is_default), None
    )
    if default_pm is None:
        raise HTTPException(422, "no payment method")

    # Find device
    result = await session.execute(select(Device).where(Device.id == body.device_id))
    device = result.scalars().first()
    if device is None:
        raise HTTPException(404, "device not found")
    if device.current_custody != "location":
        raise HTTPException(409, "device not available")
    if device.current_location_id != body.location_id:
        raise HTTPException(409, "device not at specified location")

    # Find tariff
    tariff_result = await session.execute(
        select(Tariff)
        .where(
            Tariff.is_active.is_(True),
            (Tariff.device_model == device.model) | (Tariff.device_model.is_(None)),
        )
        .order_by(Tariff.device_model.desc().nullslast())
        .limit(1)
    )
    tariff = tariff_result.scalars().first()
    if tariff is None:
        raise HTTPException(500, "no active tariff found")

    # Handle Udobno subscription
    has_udobno = False
    if user.subscription and user.subscription.status == "active":
        has_udobno = True
    elif body.with_udobno_subscription:
        # Create subscription (mock charge for now)
        sub = Subscription(
            user_id=user.id,
            plan="udobno",
            price=199.00,
            status="active",
            started_at=_utcnow(),
            next_charge_at=_utcnow() + timedelta(days=30),
        )
        session.add(sub)
        has_udobno = True

    deposit = 1500.0 if has_udobno else 4500.0
    now = _utcnow()

    rental = Rental(
        user_id=user.id,
        device_id=device.id,
        tariff_id=tariff.id,
        issued_at_location_id=body.location_id,
        status="booked",
        booking_expires_at=now + timedelta(minutes=30),
        deposit_amount=deposit,
        has_udobno_at_booking=has_udobno,
        total_charged=0,
        debt_amount=0,
    )
    session.add(rental)

    # Update device custody
    device.current_custody = "reserved"
    device.current_rental_id = rental.id

    await session.flush()

    # Create deposit hold payment record
    payment = Payment(
        user_id=user.id,
        rental_id=rental.id,
        type="deposit_hold",
        amount=deposit,
        payment_method_id=default_pm.id,
        provider_status="pending",
    )
    session.add(payment)
    await session.commit()
    await session.refresh(rental)

    return await _build_rental_detail(rental, session)


@router.post("/{rental_id}/cancel-booking")
async def cancel_booking(
    rental_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")
    if rental.status != "booked":
        raise HTTPException(409, "rental is not in booked status")

    rental.status = "cancelled_manual"

    # Restore device
    dev_result = await session.execute(
        select(Device).where(Device.id == rental.device_id)
    )
    device = dev_result.scalars().first()
    if device:
        device.current_custody = "location"
        device.current_rental_id = None

    # Mark deposit hold as cancelled (mock)
    pay_result = await session.execute(
        select(Payment).where(
            Payment.rental_id == rental_id, Payment.type == "deposit_hold"
        )
    )
    payment = pay_result.scalars().first()
    if payment:
        payment.provider_status = "cancelled"

    await session.commit()
    return {"status": "cancelled"}


@router.get("", response_model=RentalListResponse)
async def list_rentals(
    status_filter: str = Query("active", pattern="^(active|history)$"),
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> RentalListResponse:
    statuses = ACTIVE_STATUSES if status_filter == "active" else HISTORY_STATUSES

    result = await session.execute(
        select(Rental)
        .where(Rental.user_id == user.id, Rental.status.in_(statuses))
        .order_by(Rental.created_at.desc())
    )
    rentals = result.scalars().all()

    items = [await _build_rental_brief(r, session) for r in rentals]
    return RentalListResponse(items=items, total=len(items))


@router.get("/{rental_id}", response_model=RentalDetail)
async def get_rental(
    rental_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> RentalDetail:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")
    return await _build_rental_detail(rental, session)


@router.post("/{rental_id}/confirm-pickup", response_model=ConfirmPickupResponse)
async def confirm_pickup(
    rental_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> ConfirmPickupResponse:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")
    if rental.status not in ("booked", "pending_activation"):
        raise HTTPException(409, "rental cannot be activated from current status")

    now = _utcnow()
    rental.status = "active"
    rental.activated_at = now
    rental.paid_until = now + timedelta(hours=24)
    rental.next_charge_at = now + timedelta(hours=24)

    # Create first daily charge payment (mock succeeded)
    payment = Payment(
        user_id=user.id,
        rental_id=rental.id,
        type="daily_charge",
        amount=349.0,
        provider_status="succeeded",
        captured_at=now,
    )
    session.add(payment)

    rental.total_charged = float(rental.total_charged) + 349.0

    # Update device custody
    dev_result = await session.execute(
        select(Device).where(Device.id == rental.device_id)
    )
    device = dev_result.scalars().first()
    if device:
        device.current_custody = "with_client"

    await session.commit()

    return ConfirmPickupResponse(
        status="active",
        activated_at=rental.activated_at,
        paid_until=rental.paid_until,
    )


@router.post("/{rental_id}/report-pickup-issue", response_model=IncidentBrief)
async def report_pickup_issue(
    rental_id: uuid.UUID,
    body: dict,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> IncidentBrief:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")

    incident = Incident(
        rental_id=rental.id,
        device_id=rental.device_id,
        user_id=user.id,
        type=body.get("type", "pickup_issue"),
        status="open",
        description=body.get("description"),
        reported_by="client",
        reported_by_id=user.id,
    )
    session.add(incident)
    await session.commit()
    await session.refresh(incident)

    return IncidentBrief(
        id=incident.id,
        type=incident.type,
        status=incident.status,
        description=incident.description,
        created_at=incident.created_at,
    )


@router.post("/{rental_id}/init-return")
async def init_return(
    rental_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")
    if rental.status not in ("active", "paused_payment_failed", "overdue"):
        raise HTTPException(409, "rental is not active")

    return {"message": "Покажи QR партнёру", "rental_id": str(rental.id)}


@router.post("/{rental_id}/confirm-return")
async def confirm_return(
    rental_id: uuid.UUID,
    body: dict,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")

    now = _utcnow()
    rental.status = "closed"
    rental.closed_at = now

    # Restore device to location
    dev_result = await session.execute(
        select(Device).where(Device.id == rental.device_id)
    )
    device = dev_result.scalars().first()
    if device:
        device.current_custody = "location"
        device.current_rental_id = None

    await session.commit()
    return {"status": "closed", "deposit_refund": "processing"}


@router.post("/{rental_id}/report-return-dispute", response_model=IncidentBrief)
async def report_return_dispute(
    rental_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> IncidentBrief:
    result = await session.execute(
        select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")

    rental.status = "pending_return_dispute"

    incident = Incident(
        rental_id=rental.id,
        device_id=rental.device_id,
        user_id=user.id,
        type="dispute_return",
        status="open",
        reported_by="client",
        reported_by_id=user.id,
    )
    session.add(incident)
    await session.commit()
    await session.refresh(incident)

    return IncidentBrief(
        id=incident.id,
        type=incident.type,
        status=incident.status,
        description=incident.description,
        created_at=incident.created_at,
    )
