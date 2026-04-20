"""Admin incident management endpoints (SPEC §7, §10, §14.3)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog
from app.models.rentals import Incident
from app.schemas.admin import (
    IncidentAssignRequest,
    IncidentDetail,
    IncidentListItem,
    IncidentListResponse,
    IncidentResolveRequest,
    IncidentUpdateQuoteRequest,
)

router = APIRouter(prefix="/incidents", tags=["admin-incidents"])


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    type: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> IncidentListResponse:
    base = select(Incident)
    count_q = select(func.count()).select_from(Incident)

    if status:
        base = base.where(Incident.status == status)
        count_q = count_q.where(Incident.status == status)
    if type:
        base = base.where(Incident.type == type)
        count_q = count_q.where(Incident.type == type)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Incident.created_at.desc()).offset(offset).limit(size))
    incidents = result.scalars().all()

    return IncidentListResponse(
        items=[IncidentListItem.model_validate(i) for i in incidents],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(
    incident_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> IncidentDetail:
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(404, "incident not found")
    return IncidentDetail.model_validate(incident)


@router.post("/{incident_id}/assign")
async def assign_incident(
    incident_id: uuid.UUID,
    body: IncidentAssignRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(404, "incident not found")

    incident.reviewer_id = body.admin_user_id
    incident.status = "in_progress"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="incident.assign",
        entity_type="incident",
        entity_id=incident.id,
        changes={"reviewer_id": str(body.admin_user_id)},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "assigned"}


@router.post("/{incident_id}/update-quote")
async def update_quote(
    incident_id: uuid.UUID,
    body: IncidentUpdateQuoteRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(404, "incident not found")

    incident.repair_estimate = body.repair_estimate
    incident.client_charge = body.client_charge
    incident.breakdown = body.breakdown
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="incident.update_quote",
        entity_type="incident",
        entity_id=incident.id,
        changes={"repair_estimate": body.repair_estimate, "client_charge": body.client_charge},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "quote_updated"}


@router.post("/{incident_id}/escalate")
async def escalate_incident(
    incident_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(404, "incident not found")

    incident.severity = "critical"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="incident.escalate",
        entity_type="incident",
        entity_id=incident.id,
        changes={"severity": "critical"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "escalated"}


@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: uuid.UUID,
    body: IncidentResolveRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(404, "incident not found")

    incident.status = "resolved"
    incident.resolution_type = body.resolution_type
    incident.reviewer_comment = body.reviewer_comment
    incident.resolved_at = datetime.now(UTC)
    incident.reviewed_at = datetime.now(UTC)
    incident.reviewer_id = admin.id
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="incident.resolve",
        entity_type="incident",
        entity_id=incident.id,
        changes={"status": "resolved", "resolution_type": body.resolution_type},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "resolved"}
