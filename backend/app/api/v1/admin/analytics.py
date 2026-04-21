"""Admin analytics endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.schemas.admin import (
    CohortData,
    LtvData,
    ProfitabilityData,
    UtilizationData,
)

router = APIRouter(prefix="/analytics", tags=["admin-analytics"])


@router.get("/cohorts", response_model=CohortData)
async def cohort_analysis(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> CohortData:
    # Placeholder: real implementation aggregates user registration cohorts
    return CohortData()


@router.get("/utilization", response_model=UtilizationData)
async def device_utilization(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> UtilizationData:
    # Placeholder: real implementation calculates utilization rates
    return UtilizationData()


@router.get("/partner-ranking")
async def partner_ranking(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    # Placeholder: real implementation ranks partners by metrics
    return {"rankings": []}


@router.get("/profitability", response_model=ProfitabilityData)
async def profitability(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProfitabilityData:
    # Placeholder: real implementation calculates profitability
    return ProfitabilityData()


@router.get("/ltv", response_model=LtvData)
async def ltv_metrics(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> LtvData:
    # Placeholder: real implementation calculates LTV, CAC, retention
    return LtvData()
