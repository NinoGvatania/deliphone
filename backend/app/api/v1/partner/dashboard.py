"""Partner dashboard endpoint (SPEC §6, §14.2)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.catalog import Device
from app.models.finance import PartnerTransaction
from app.models.partners import PartnerUser
from app.models.rentals import Rental
from app.schemas.partner import DashboardResponse

router = APIRouter(tags=["partner-dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> DashboardResponse:
    partner_id = partner_user.partner_id

    # Devices at any of partner's locations
    from app.models.partners import PartnerLocation

    loc_ids_q = select(PartnerLocation.id).where(
        PartnerLocation.partner_id == partner_id
    )

    # awaiting_issue: rentals booked/pending_activation at partner locations
    awaiting_issue_q = select(func.count()).select_from(Rental).where(
        Rental.status.in_(("booked", "pending_activation")),
        Rental.issued_at_location_id.in_(loc_ids_q),
    )
    awaiting_issue = (await session.execute(awaiting_issue_q)).scalar() or 0

    # awaiting_return: simplified to 0 for now
    awaiting_return = 0

    # devices total at partner locations
    devices_total_q = select(func.count()).select_from(Device).where(
        Device.current_location_id.in_(loc_ids_q)
    )
    devices_total = (await session.execute(devices_total_q)).scalar() or 0

    # devices free (custody = 'location' means available)
    devices_free_q = select(func.count()).select_from(Device).where(
        Device.current_location_id.in_(loc_ids_q),
        Device.current_custody == "location",
    )
    devices_free = (await session.execute(devices_free_q)).scalar() or 0

    # Today's partner transactions
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    revenue_q = select(func.coalesce(func.sum(PartnerTransaction.amount), 0)).where(
        PartnerTransaction.partner_id == partner_id,
        PartnerTransaction.type == "rental_commission",
        PartnerTransaction.created_at >= today_start,
    )
    revenue_today = float((await session.execute(revenue_q)).scalar() or 0)

    acq_count_q = select(func.count()).select_from(PartnerTransaction).where(
        PartnerTransaction.partner_id == partner_id,
        PartnerTransaction.type == "acquisition_bonus",
        PartnerTransaction.created_at >= today_start,
    )
    acquisitions_today = (await session.execute(acq_count_q)).scalar() or 0

    acq_sum_q = select(func.coalesce(func.sum(PartnerTransaction.amount), 0)).where(
        PartnerTransaction.partner_id == partner_id,
        PartnerTransaction.type == "acquisition_bonus",
        PartnerTransaction.created_at >= today_start,
    )
    acquisition_bonus = float((await session.execute(acq_sum_q)).scalar() or 0)

    return DashboardResponse(
        awaiting_issue=awaiting_issue,
        awaiting_return=awaiting_return,
        devices_total=devices_total,
        devices_free=devices_free,
        revenue_today=revenue_today,
        acquisitions_today=acquisitions_today,
        acquisition_bonus=acquisition_bonus,
    )
