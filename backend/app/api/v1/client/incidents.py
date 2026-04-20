"""Client incident endpoints (SPEC.md §14.1).

All 11 incident types: damage, malfunction, loss, theft, water,
incomplete_return, frp_locked, dispute_return, partner_issue, possible_loss, other.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.catalog import Device
from app.models.rentals import Incident, Rental
from app.models.users import User
from app.schemas.rentals import IncidentBrief, IncidentCreateRequest

router = APIRouter(prefix="/incidents", tags=["client-incidents"])

VALID_INCIDENT_TYPES = [
    "damage", "malfunction", "loss", "theft", "water",
    "incomplete_return", "frp_locked", "dispute_return",
    "partner_issue", "possible_loss", "other",
]


class IncidentCreateBody(IncidentCreateRequest):
    rental_id: uuid.UUID

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_INCIDENT_TYPES:
            raise ValueError(f"Invalid incident type. Must be one of: {VALID_INCIDENT_TYPES}")
        return v


@router.post("", response_model=IncidentBrief, status_code=201)
async def create_incident(
    body: IncidentCreateBody,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> IncidentBrief:
    # Validate rental belongs to user
    result = await session.execute(
        select(Rental).where(Rental.id == body.rental_id, Rental.user_id == user.id)
    )
    rental = result.scalars().first()
    if rental is None:
        raise HTTPException(404, "rental not found")

    severity = "normal"
    if body.type in ("loss", "theft"):
        severity = "critical"
    elif body.type == "malfunction":
        severity = "high"

    incident = Incident(
        rental_id=rental.id,
        device_id=rental.device_id,
        user_id=user.id,
        type=body.type,
        severity=severity,
        status="open",
        description=body.description,
        photo_urls=body.photo_urls if body.photo_urls else None,
        reported_by="client",
        reported_by_id=user.id,
    )
    session.add(incident)

    # Freeze rental for loss/theft
    if body.type in ("loss", "theft"):
        rental.status = "frozen_incident"

    # Malfunction: freeze rental, mark device in_service
    if body.type == "malfunction":
        rental.status = "frozen_incident"
        device_result = await session.execute(
            select(Device).where(Device.id == rental.device_id)
        )
        device = device_result.scalars().first()
        if device:
            device.current_custody = "in_service"

    await session.commit()
    await session.refresh(incident)

    return IncidentBrief(
        id=incident.id,
        type=incident.type,
        status=incident.status,
        description=incident.description,
        created_at=incident.created_at,
    )


@router.get("", response_model=list[IncidentBrief])
async def list_incidents(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> list[IncidentBrief]:
    result = await session.execute(
        select(Incident)
        .where(Incident.user_id == user.id)
        .order_by(Incident.created_at.desc())
    )
    incidents = result.scalars().all()
    return [
        IncidentBrief(
            id=inc.id,
            type=inc.type,
            status=inc.status,
            description=inc.description,
            created_at=inc.created_at,
        )
        for inc in incidents
    ]


@router.get("/{incident_id}", response_model=IncidentBrief)
async def get_incident(
    incident_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> IncidentBrief:
    result = await session.execute(
        select(Incident).where(Incident.id == incident_id, Incident.user_id == user.id)
    )
    incident = result.scalars().first()
    if incident is None:
        raise HTTPException(404, "incident not found")

    return IncidentBrief(
        id=incident.id,
        type=incident.type,
        status=incident.status,
        description=incident.description,
        created_at=incident.created_at,
    )


class DisputeRequest(BaseModel):
    reason: str


class PoliceReportUploadRequest(BaseModel):
    police_report_number: str
    police_report_url: str


@router.post("/{incident_id}/accept")
async def accept_incident_quote(
    incident_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Client accepts the damage quote — triggers charge from deposit/card (SPEC §10)."""
    result = await session.execute(
        select(Incident).where(Incident.id == incident_id, Incident.user_id == user.id)
    )
    incident = result.scalars().first()
    if incident is None:
        raise HTTPException(404, "incident not found")
    if incident.client_charge is None:
        raise HTTPException(400, "no quote to accept")
    if incident.client_accepted_at is not None:
        raise HTTPException(409, "already accepted")

    incident.client_accepted_at = datetime.now(UTC)
    incident.status = "resolved"
    incident.resolution_type = "client_accepted"
    incident.resolved_at = datetime.now(UTC)
    await session.commit()
    return {"status": "accepted"}


@router.post("/{incident_id}/dispute")
async def dispute_incident(
    incident_id: uuid.UUID,
    body: DisputeRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Client disputes the damage quote — escalates to manager review (SPEC §10)."""
    result = await session.execute(
        select(Incident).where(Incident.id == incident_id, Incident.user_id == user.id)
    )
    incident = result.scalars().first()
    if incident is None:
        raise HTTPException(404, "incident not found")
    if incident.client_disputed_at is not None:
        raise HTTPException(409, "already disputed")

    incident.client_disputed_at = datetime.now(UTC)
    incident.dispute_reason = body.reason
    incident.status = "disputed"
    await session.commit()
    return {"status": "disputed"}


@router.post("/{incident_id}/upload-police-report")
async def upload_police_report(
    incident_id: uuid.UUID,
    body: PoliceReportUploadRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Upload police report for theft/loss incidents (SPEC §10)."""
    result = await session.execute(
        select(Incident).where(Incident.id == incident_id, Incident.user_id == user.id)
    )
    incident = result.scalars().first()
    if incident is None:
        raise HTTPException(404, "incident not found")
    if incident.type not in ("loss", "theft"):
        raise HTTPException(400, "police report only for loss/theft incidents")

    incident.police_report_number = body.police_report_number
    incident.police_report_url = body.police_report_url
    await session.commit()
    return {"status": "uploaded"}
