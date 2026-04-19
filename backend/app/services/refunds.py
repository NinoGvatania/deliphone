"""Refund calculations for early device returns (SPEC §9.9).

Rounding rule: usage is rounded UP to 6-hour blocks.
If client paid for 24h but returns after 14h → charged for 18h (3 blocks).
Refund = paid - (blocks × hourly_rate × 6).
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from decimal import Decimal

from app.core.logging import get_logger

logger = get_logger("refunds")


def calculate_early_return_refund(
    activated_at: datetime,
    paid_until: datetime,
    daily_rate: Decimal = Decimal("349.00"),
    returned_at: datetime | None = None,
) -> Decimal:
    """Calculate proportional refund for early return.

    Args:
        activated_at: when the rental was activated
        paid_until: when the current payment period ends
        daily_rate: per-24h rate (default 349 RUB)
        returned_at: when the device is returned (default: now)

    Returns:
        Refund amount (>= 0). Zero if usage exceeds paid period.
    """
    now = returned_at or datetime.now(UTC)

    if now >= paid_until:
        return Decimal("0.00")

    # Total paid period in hours
    total_hours = (paid_until - activated_at).total_seconds() / 3600

    # Usage in hours
    usage_hours = (now - activated_at).total_seconds() / 3600

    # Round up to 6-hour blocks
    usage_blocks = math.ceil(usage_hours / 6)
    charged_hours = usage_blocks * 6

    # Hourly rate
    hourly_rate = daily_rate / Decimal("24")

    # Charged amount for actual usage
    charged = (hourly_rate * Decimal(str(charged_hours))).quantize(Decimal("0.01"))

    # Total paid for this period
    total_paid_hours = Decimal(str(total_hours))
    total_paid = (hourly_rate * total_paid_hours).quantize(Decimal("0.01"))

    refund = max(total_paid - charged, Decimal("0.00"))

    logger.info(
        "refund.calculated",
        usage_hours=round(usage_hours, 1),
        usage_blocks=usage_blocks,
        charged=str(charged),
        total_paid=str(total_paid),
        refund=str(refund),
    )

    return refund
