"""Client subscription management -- plan Udobno (SPEC.md SS1.6, SS9)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.rentals import Payment
from app.models.users import PaymentMethod, Subscription, User
from app.schemas.payments import SubscriptionCancelResponse, SubscriptionOut
from app.services.receipts import get_receipt_email
from app.services.yookassa import get_yookassa

router = APIRouter(tags=["client-subscription"])

UDOBNO_PRICE = Decimal("199.00")
BILLING_PERIOD_DAYS = 30


@router.get("/me/subscription", response_model=SubscriptionOut | None)
async def get_subscription(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> SubscriptionOut | None:
    result = await session.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalars().first()
    if not sub:
        return None
    return SubscriptionOut.model_validate(sub)


@router.post("/me/subscription", response_model=SubscriptionOut)
async def create_subscription(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> SubscriptionOut:
    existing = await session.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    if existing.scalars().first():
        raise HTTPException(409, "active subscription already exists")

    pm_result = await session.execute(
        select(PaymentMethod).where(
            PaymentMethod.user_id == user.id,
            PaymentMethod.is_default == True,  # noqa: E712
        )
    )
    default_pm = pm_result.scalars().first()
    if not default_pm:
        raise HTTPException(422, "no default payment method, add a card first")

    yookassa = get_yookassa()
    email = get_receipt_email(user)
    receipt = {
        "customer": {"email": email},
        "items": [
            {
                "description": "Подписка Удобно (30 дней)",
                "quantity": "1.00",
                "amount": {"value": str(UDOBNO_PRICE), "currency": "RUB"},
                "vat_code": 1,
            }
        ],
    }
    payment_result = await yookassa.create_payment(
        amount=UDOBNO_PRICE,
        currency="RUB",
        description="Подписка Удобно — Делифон",
        payment_method_id=default_pm.yookassa_token,
        receipt=receipt,
        metadata={"user_id": str(user.id), "type": "subscription"},
    )

    now = datetime.now(UTC)
    sub = Subscription(
        user_id=user.id,
        plan="udobno",
        price=float(UDOBNO_PRICE),
        status="active",
        started_at=now,
        next_charge_at=now + timedelta(days=BILLING_PERIOD_DAYS),
        total_paid=float(UDOBNO_PRICE),
    )
    session.add(sub)
    await session.flush()

    payment_record = Payment(
        user_id=user.id,
        subscription_id=sub.id,
        type="subscription",
        amount=float(UDOBNO_PRICE),
        currency="RUB",
        provider="yookassa",
        provider_payment_id=payment_result.get("id"),
        provider_status=payment_result.get("status"),
        payment_method_id=default_pm.id,
    )
    session.add(payment_record)
    await session.commit()
    await session.refresh(sub)

    return SubscriptionOut.model_validate(sub)


@router.post("/me/subscription/cancel", response_model=SubscriptionCancelResponse)
async def cancel_subscription(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> SubscriptionCancelResponse:
    result = await session.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(404, "no active subscription")

    now = datetime.now(UTC)
    sub.status = "cancelled"
    sub.cancelled_at = now
    sub.ends_at = sub.next_charge_at
    await session.commit()

    return SubscriptionCancelResponse(status="cancelled", ends_at=sub.ends_at)
