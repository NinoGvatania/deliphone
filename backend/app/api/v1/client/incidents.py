"""Client incident endpoints (SPEC.md §14.1)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.rentals import Incident, Rental
from app.models.users import User
from app.schemas.rentals import IncidentBrief, IncidentCreateRequest

router = APIRouter(prefix="/incidents", tags=["client-incidents"])


class IncidentCreateBody(IncidentCreateRequest):
    rental_id: uuid.UUID


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

    incident = Incident(
        rental_id=rental.id,
        device_id=rental.device_id,
        user_id=user.id,
        type=body.type,
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
