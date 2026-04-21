"""Admin dashboard endpoints (SPEC §7.3, §14.3)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_admin
from app.models.admin import AdminUser
from app.models.catalog import Device
from app.models.rentals import Incident, Payment, Rental
from app.models.users import Subscription
from app.schemas.admin import (
    AlertItem,
    DashboardKPI,
    FinanceReport,
    MetricsData,
)

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])


@router.get("", response_model=DashboardKPI)
async def dashboard_kpi(
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> DashboardKPI:
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    active_rentals = (await session.execute(
        select(func.count()).select_from(Rental).where(Rental.status == "active")
    )).scalar() or 0

    open_incidents = (await session.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status.in_(["open", "in_progress", "waiting_client"])
        )
    )).scalar() or 0

    devices_total = (await session.execute(
        select(func.count()).select_from(Device).where(Device.status != "written_off")
    )).scalar() or 0

    devices_free = (await session.execute(
        select(func.count()).select_from(Device).where(
            Device.status == "active", Device.current_custody == "partner"
        )
    )).scalar() or 0

    revenue_today = (await session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.captured_at >= today_start
        )
    )).scalar() or 0.0

    return DashboardKPI(
        active_rentals=active_rentals,
        open_incidents=open_incidents,
        devices_total=devices_total,
        devices_free=devices_free,
        revenue_today=float(revenue_today),
    )


@router.get("/finances", response_model=FinanceReport)
async def dashboard_finances(
    period: str = Query("month", regex="^(today|week|month|year)$"),
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> FinanceReport:
    now = datetime.now(UTC)
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    else:
        start = now - timedelta(days=365)

    revenue_rentals = float((await session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.captured_at >= start, Payment.type == "daily_charge"
        )
    )).scalar() or 0)

    revenue_subscriptions = float((await session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.captured_at >= start, Payment.type == "subscription"
        )
    )).scalar() or 0)

    revenue_penalties = float((await session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.captured_at >= start, Payment.type == "penalty"
        )
    )).scalar() or 0)

    total_revenue = revenue_rentals + revenue_subscriptions + revenue_penalties

    expense_tax_usn = total_revenue * 0.06
    expense_yookassa = total_revenue * 0.028
    expense_partner_commission = revenue_rentals * 0.30
    total_expenses = expense_tax_usn + expense_yookassa + expense_partner_commission
    net_profit = total_revenue - total_expenses
    margin_pct = (net_profit / total_revenue * 100) if total_revenue > 0 else 0.0

    return FinanceReport(
        period=period,
        revenue_rentals=revenue_rentals,
        revenue_subscriptions=revenue_subscriptions,
        revenue_penalties=revenue_penalties,
        total_revenue=total_revenue,
        expense_tax_usn=expense_tax_usn,
        expense_yookassa=expense_yookassa,
        expense_partner_commission=expense_partner_commission,
        total_expenses=total_expenses,
        net_profit=net_profit,
        margin_pct=round(margin_pct, 2),
    )


@router.get("/metrics", response_model=MetricsData)
async def dashboard_metrics(
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> MetricsData:
    # Placeholder: real implementation queries daily aggregates
    return MetricsData()


@router.get("/alerts", response_model=list[AlertItem])
async def dashboard_alerts(
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[AlertItem]:
    alerts: list[AlertItem] = []

    critical_incidents = (await session.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status == "open", Incident.severity == "critical"
        )
    )).scalar() or 0
    if critical_incidents > 0:
        alerts.append(AlertItem(
            id="critical_incidents",
            type="incident",
            message=f"{critical_incidents} critical incidents require attention",
            severity="critical",
        ))

    return alerts
