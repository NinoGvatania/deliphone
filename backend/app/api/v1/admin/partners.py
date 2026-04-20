"""Admin partner management endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.finance import PartnerPayout, PartnerTransaction
from app.models.ops import AuditLog, InventoryAudit
from app.models.partners import Partner
from app.schemas.admin import (
    PartnerAdjustmentRequest,
    PartnerDetail,
    PartnerListItem,
    PartnerListResponse,
    PartnerUpdateRequest,
)

router = APIRouter(prefix="/partners", tags=["admin-partners"])


@router.get("", response_model=PartnerListResponse)
async def list_partners(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> PartnerListResponse:
    base = select(Partner)
    count_q = select(func.count()).select_from(Partner)

    if status:
        base = base.where(Partner.status == status)
        count_q = count_q.where(Partner.status == status)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Partner.created_at.desc()).offset(offset).limit(size))
    partners = result.scalars().all()

    return PartnerListResponse(
        items=[PartnerListItem.model_validate(p) for p in partners],
        total=total,
        page=page,
        size=size,
    )


@router.get("/applications")
async def list_partner_applications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    base = select(Partner).where(Partner.status == "pending")
    count_q = select(func.count()).select_from(Partner).where(Partner.status == "pending")

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Partner.created_at.desc()).offset(offset).limit(size))
    partners = result.scalars().all()

    return {
        "items": [PartnerListItem.model_validate(p).model_dump() for p in partners],
        "total": total,
        "page": page,
        "size": size,
    }


@router.post("/applications/{partner_id}/approve")
async def approve_partner_application(
    partner_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")
    if partner.status != "pending":
        raise HTTPException(409, "partner is not in pending status")

    partner.status = "active"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.approve",
        entity_type="partner",
        entity_id=partner.id,
        changes={"status": "active"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "approved"}


@router.get("/{partner_id}", response_model=PartnerDetail)
async def get_partner(
    partner_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> PartnerDetail:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")
    return PartnerDetail.model_validate(partner)


@router.patch("/{partner_id}", response_model=PartnerDetail)
async def update_partner(
    partner_id: uuid.UUID,
    body: PartnerUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> PartnerDetail:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(partner, field, value)
        changes[field] = value

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.update",
        entity_type="partner",
        entity_id=partner.id,
        changes=changes,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(partner)
    return PartnerDetail.model_validate(partner)


@router.post("/{partner_id}/suspend")
async def suspend_partner(
    partner_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    partner.status = "suspended"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.suspend",
        entity_type="partner",
        entity_id=partner.id,
        changes={"status": "suspended"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "suspended"}


@router.post("/{partner_id}/block")
async def block_partner(
    partner_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    partner.status = "blocked"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.block",
        entity_type="partner",
        entity_id=partner.id,
        changes={"status": "blocked"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "blocked"}


@router.post("/{partner_id}/initiate-audit")
async def initiate_audit(
    partner_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    # Use first location for audit
    location_id = partner.locations[0].id if partner.locations else None
    if not location_id:
        raise HTTPException(400, "partner has no locations")

    audit = InventoryAudit(
        partner_id=partner.id,
        location_id=location_id,
        initiated_by_id=admin.id,
        status="scheduled",
        scheduled_at=datetime.now(UTC),
    )
    session.add(audit)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.initiate_audit",
        entity_type="partner",
        entity_id=partner.id,
        changes={"audit_status": "scheduled"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "audit_initiated"}


@router.post("/{partner_id}/initiate-payout")
async def initiate_payout(
    partner_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    payout = PartnerPayout(
        partner_id=partner.id,
        amount=float(partner.balance),
        status="initiated",
        initiated_at=datetime.now(UTC),
    )
    session.add(payout)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="partner.initiate_payout",
        entity_type="partner",
        entity_id=partner.id,
        changes={"amount": float(partner.balance)},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "payout_initiated"}


@router.post("/{partner_id}/adjustment")
async def partner_adjustment(
    partner_id: uuid.UUID,
    body: PartnerAdjustmentRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    if not partner:
        raise HTTPException(404, "partner not found")

    direction = "credit" if body.type == "bonus" else "debit"
    if direction == "credit":
        partner.balance = float(partner.balance) + body.amount
    else:
        partner.balance = float(partner.balance) - body.amount

    tx = PartnerTransaction(
        partner_id=partner.id,
        type=body.type,
        direction=direction,
        amount=body.amount,
        description=body.description,
    )
    session.add(tx)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action=f"partner.adjustment.{body.type}",
        entity_type="partner",
        entity_id=partner.id,
        changes={"amount": body.amount, "type": body.type, "description": body.description},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "adjustment_applied", "new_balance": float(partner.balance)}
