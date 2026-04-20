"""Admin finance endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.finance import Debt, PartnerPayout, PartnerTransaction
from app.models.rentals import Payment
from app.models.users import Subscription
from app.schemas.admin import (
    DebtListItem,
    DebtListResponse,
    FinanceOverview,
    PartnerPayoutListItem,
    TransactionListItem,
    TransactionListResponse,
)

router = APIRouter(prefix="/finance", tags=["admin-finance"])


@router.get("/overview", response_model=FinanceOverview)
async def finance_overview(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> FinanceOverview:
    total_revenue = float((await session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.captured_at.isnot(None))
    )).scalar() or 0)

    total_payouts = float((await session.execute(
        select(func.coalesce(func.sum(PartnerPayout.amount), 0)).where(PartnerPayout.status == "completed")
    )).scalar() or 0)

    total_debts = float((await session.execute(
        select(func.coalesce(func.sum(Debt.amount - Debt.amount_paid), 0)).where(Debt.status == "active")
    )).scalar() or 0)

    active_sub_revenue = float((await session.execute(
        select(func.coalesce(func.sum(Subscription.price), 0)).where(Subscription.status == "active")
    )).scalar() or 0)

    return FinanceOverview(
        total_revenue=total_revenue,
        total_payouts=total_payouts,
        total_debts=total_debts,
        active_subscriptions_revenue=active_sub_revenue,
    )


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    type: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> TransactionListResponse:
    base = select(Payment)
    count_q = select(func.count()).select_from(Payment)

    if type:
        base = base.where(Payment.type == type)
        count_q = count_q.where(Payment.type == type)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Payment.created_at.desc()).offset(offset).limit(size))
    payments = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionListItem.model_validate(p) for p in payments],
        total=total,
        page=page,
        size=size,
    )


@router.get("/reconciliation")
async def reconciliation(
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    # Placeholder: real implementation compares internal payments with YooKassa data
    return {"status": "ok", "discrepancies": []}


@router.get("/debts", response_model=DebtListResponse)
async def list_debts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> DebtListResponse:
    base = select(Debt)
    count_q = select(func.count()).select_from(Debt)

    if status:
        base = base.where(Debt.status == status)
        count_q = count_q.where(Debt.status == status)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(Debt.created_at.desc()).offset(offset).limit(size))
    debts = result.scalars().all()

    return DebtListResponse(
        items=[DebtListItem.model_validate(d) for d in debts],
        total=total,
        page=page,
        size=size,
    )


@router.get("/subscriptions")
async def subscription_revenue(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    active_count = (await session.execute(
        select(func.count()).select_from(Subscription).where(Subscription.status == "active")
    )).scalar() or 0

    total_paid = float((await session.execute(
        select(func.coalesce(func.sum(Subscription.total_paid), 0))
    )).scalar() or 0)

    return {"active_count": active_count, "total_paid": total_paid}


@router.get("/partner-payouts", response_model=list[PartnerPayoutListItem])
async def list_partner_payouts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[PartnerPayoutListItem]:
    offset = (page - 1) * size
    result = await session.execute(
        select(PartnerPayout).order_by(PartnerPayout.created_at.desc()).offset(offset).limit(size)
    )
    payouts = result.scalars().all()
    return [PartnerPayoutListItem.model_validate(p) for p in payouts]
