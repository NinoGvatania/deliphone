"""Admin audit log endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog
from app.schemas.admin import AuditLogEntry, AuditLogListResponse

router = APIRouter(prefix="/audit", tags=["admin-audit-log"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_log(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    admin_user_id: uuid.UUID | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> AuditLogListResponse:
    base = select(AuditLog)
    count_q = select(func.count()).select_from(AuditLog)

    if admin_user_id:
        base = base.where(AuditLog.admin_user_id == admin_user_id)
        count_q = count_q.where(AuditLog.admin_user_id == admin_user_id)
    if action:
        base = base.where(AuditLog.action.ilike(f"%{action}%"))
        count_q = count_q.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        base = base.where(AuditLog.entity_type == entity_type)
        count_q = count_q.where(AuditLog.entity_type == entity_type)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(AuditLog.created_at.desc()).offset(offset).limit(size))
    entries = result.scalars().all()

    return AuditLogListResponse(
        items=[AuditLogEntry.model_validate(e) for e in entries],
        total=total,
        page=page,
        size=size,
    )
