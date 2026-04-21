"""Client payment methods management (SPEC.md SS9, SS14.1)."""

from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.users import PaymentMethod, User
from app.schemas.payments import (
    PaymentMethodConfirmRequest,
    PaymentMethodConfirmResponse,
    PaymentMethodInitResponse,
    PaymentMethodOut,
    SetDefaultResponse,
)
from app.services.receipts import get_receipt_customer
from app.services.yookassa import get_yookassa

router = APIRouter(tags=["client-payments"])

SETUP_AMOUNT = Decimal("1.00")


@router.get("/me/payment-methods", response_model=list[PaymentMethodOut])
async def list_payment_methods(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> list[PaymentMethodOut]:
    result = await session.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == user.id)
    )
    return [PaymentMethodOut.model_validate(m) for m in result.scalars().all()]


@router.post("/me/payment-methods/init", response_model=PaymentMethodInitResponse)
async def init_payment_method(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> PaymentMethodInitResponse:
    yookassa = get_yookassa()
    receipt = {
        "customer": get_receipt_customer(user),
        "items": [
            {
                "description": "Привязка карты",
                "quantity": "1.00",
                "amount": {"value": str(SETUP_AMOUNT), "currency": "RUB"},
                "vat_code": 1,
            }
        ],
    }
    result = await yookassa.create_payment(
        amount=SETUP_AMOUNT,
        currency="RUB",
        description="Привязка карты Делифон",
        receipt=receipt,
        return_url="https://app.deliphone.ru/card-bound",
        metadata={"user_id": str(user.id), "type": "card_setup"},
    )
    confirmation = result.get("confirmation", {})
    return PaymentMethodInitResponse(
        confirmation_url=confirmation.get("confirmation_url"),
        confirmation_token=confirmation.get("confirmation_token"),
        provider_payment_id=result["id"],
    )


@router.post("/me/payment-methods/confirm", response_model=PaymentMethodConfirmResponse)
async def confirm_payment_method(
    body: PaymentMethodConfirmRequest,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> PaymentMethodConfirmResponse:
    yookassa = get_yookassa()
    payment_data = await yookassa.get_payment(body.provider_payment_id)
    if payment_data.get("status") != "succeeded":
        raise HTTPException(400, "payment not succeeded yet")

    pm_info = payment_data.get("payment_method", {})
    yookassa_token = pm_info.get("id")
    if not yookassa_token:
        raise HTTPException(400, "no payment method token in response")

    card = pm_info.get("card", {})
    card_last4 = body.card_last4 or card.get("last4")
    card_network = body.card_network or card.get("card_type")

    existing = await session.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == user.id)
    )
    is_first = not existing.scalars().first()

    pm = PaymentMethod(
        user_id=user.id,
        yookassa_token=yookassa_token,
        card_last4=card_last4,
        card_network=card_network,
        is_default=is_first,
    )
    session.add(pm)
    await session.commit()
    await session.refresh(pm)

    return PaymentMethodConfirmResponse(
        id=pm.id,
        card_last4=pm.card_last4,
        card_network=pm.card_network,
        is_default=pm.is_default,
    )


@router.delete("/me/payment-methods/{method_id}", status_code=204)
async def delete_payment_method(
    method_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> None:
    result = await session.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.user_id == user.id,
        )
    )
    pm = result.scalars().first()
    if not pm:
        raise HTTPException(404, "payment method not found")

    if pm.is_default:
        others = await session.execute(
            select(PaymentMethod).where(
                PaymentMethod.user_id == user.id,
                PaymentMethod.id != method_id,
            )
        )
        if not others.scalars().first():
            raise HTTPException(409, "cannot delete the only default payment method")

    await session.delete(pm)
    await session.commit()


@router.post("/me/payment-methods/{method_id}/set-default", response_model=SetDefaultResponse)
async def set_default_payment_method(
    method_id: uuid.UUID,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> SetDefaultResponse:
    result = await session.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.user_id == user.id,
        )
    )
    pm = result.scalars().first()
    if not pm:
        raise HTTPException(404, "payment method not found")

    await session.execute(
        update(PaymentMethod)
        .where(PaymentMethod.user_id == user.id)
        .values(is_default=False)
    )
    pm.is_default = True
    await session.commit()

    return SetDefaultResponse(id=pm.id)
