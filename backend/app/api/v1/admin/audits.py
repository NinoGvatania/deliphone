"""Admin inventory audit endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog, InventoryAudit
from app.schemas.admin import (
    AuditCreateRequest,
    AuditDetail,
    AuditListItem,
    AuditListResponse,
)

router = APIRouter(prefix="/audits", tags=["admin-audits"])


@router.get("", response_model=AuditListResponse)
async def list_audits(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> AuditListResponse:
    base = select(InventoryAudit)
    count_q = select(func.count()).select_from(InventoryAudit)

    if status:
        base = base.where(InventoryAudit.status == status)
        count_q = count_q.where(InventoryAudit.status == status)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(InventoryAudit.created_at.desc()).offset(offset).limit(size))
    audits = result.scalars().all()

    return AuditListResponse(
        items=[AuditListItem.model_validate(a) for a in audits],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=AuditDetail)
async def create_audit(
    body: AuditCreateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> AuditDetail:
    audit = InventoryAudit(
        partner_id=body.partner_id,
        location_id=body.location_id,
        initiated_by_id=admin.id,
        status="scheduled",
        scheduled_at=body.scheduled_at,
        notes=body.notes,
    )
    session.add(audit)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="inventory_audit.create",
        entity_type="inventory_audit",
        entity_id=audit.id,
        changes=body.model_dump(mode="json"),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(audit)
    return AuditDetail.model_validate(audit)


@router.get("/{audit_id}", response_model=AuditDetail)
async def get_audit(
    audit_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> AuditDetail:
    result = await session.execute(select(InventoryAudit).where(InventoryAudit.id == audit_id))
    audit = result.scalars().first()
    if not audit:
        raise HTTPException(404, "audit not found")
    return AuditDetail.model_validate(audit)
