"""Partner finance endpoints (SPEC §6, §11, §14.2)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.finance import PartnerPayout, PartnerTransaction
from app.models.partners import Partner, PartnerUser
from app.schemas.partner import (
    FinanceBalanceResponse,
    PayoutBrief,
    TransactionBrief,
    TransactionListResponse,
)

router = APIRouter(prefix="/finance", tags=["partner-finance"])


@router.get("/balance", response_model=FinanceBalanceResponse)
async def get_balance(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> FinanceBalanceResponse:
    partner_id = partner_user.partner_id

    # Current balance from partner table
    result = await session.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalars().first()
    balance = float(partner.balance) if partner else 0.0

    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    async def _sum_by_type_since(
        tx_type: str, since: datetime, direction: str = "credit"
    ) -> float:
        q = select(func.coalesce(func.sum(PartnerTransaction.amount), 0)).where(
            PartnerTransaction.partner_id == partner_id,
            PartnerTransaction.type == tx_type,
            PartnerTransaction.direction == direction,
            PartnerTransaction.created_at >= since,
        )
        return float((await session.execute(q)).scalar() or 0)

    revenue_today = await _sum_by_type_since("rental_commission", today_start)
    revenue_week = await _sum_by_type_since("rental_commission", week_start)
    revenue_month = await _sum_by_type_since("rental_commission", month_start)
    acquisitions_bonus = await _sum_by_type_since("acquisition_bonus", month_start)

    penalties_q = select(func.coalesce(func.sum(PartnerTransaction.amount), 0)).where(
        PartnerTransaction.partner_id == partner_id,
        PartnerTransaction.type == "penalty",
        PartnerTransaction.direction == "debit",
        PartnerTransaction.created_at >= month_start,
    )
    penalties = float((await session.execute(penalties_q)).scalar() or 0)

    return FinanceBalanceResponse(
        balance=balance,
        revenue_today=revenue_today,
        revenue_week=revenue_week,
        revenue_month=revenue_month,
        acquisitions_bonus=acquisitions_bonus,
        penalties=penalties,
    )


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> TransactionListResponse:
    partner_id = partner_user.partner_id

    base = select(PartnerTransaction).where(
        PartnerTransaction.partner_id == partner_id
    )
    count_base = select(func.count()).select_from(PartnerTransaction).where(
        PartnerTransaction.partner_id == partner_id
    )

    if type:
        base = base.where(PartnerTransaction.type == type)
        count_base = count_base.where(PartnerTransaction.type == type)
    if date_from:
        base = base.where(PartnerTransaction.created_at >= date_from)
        count_base = count_base.where(PartnerTransaction.created_at >= date_from)
    if date_to:
        base = base.where(PartnerTransaction.created_at <= date_to)
        count_base = count_base.where(PartnerTransaction.created_at <= date_to)

    total = (await session.execute(count_base)).scalar() or 0

    result = await session.execute(
        base.order_by(PartnerTransaction.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    transactions = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionBrief.model_validate(t) for t in transactions],
        total=total,
        page=page,
        size=size,
    )


@router.get("/payouts", response_model=list[PayoutBrief])
async def list_payouts(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> list[PayoutBrief]:
    result = await session.execute(
        select(PartnerPayout)
        .where(PartnerPayout.partner_id == partner_user.partner_id)
        .order_by(PartnerPayout.created_at.desc())
    )
    payouts = result.scalars().all()
    return [PayoutBrief.model_validate(p) for p in payouts]


@router.get("/periods/{payout_id}/act")
async def get_act_html(
    payout_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(PartnerPayout).where(PartnerPayout.id == payout_id)
    )
    payout = result.scalars().first()
    if not payout:
        raise HTTPException(404, "payout not found")
    if payout.partner_id != partner_user.partner_id:
        raise HTTPException(403, "payout belongs to another partner")

    return {"act_html": payout.act_html or "<p>Act not generated yet</p>"}
