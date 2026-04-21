"""Payment-related request/response schemas."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class PaymentMethodOut(BaseModel):
    id: UUID
    card_last4: str | None = None
    card_network: str | None = None
    is_default: bool = False
    expires_at: date | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentMethodInitResponse(BaseModel):
    confirmation_url: str | None = None
    confirmation_token: str | None = None
    provider_payment_id: str


class PaymentMethodConfirmRequest(BaseModel):
    provider_payment_id: str
    card_last4: str | None = None
    card_network: str | None = None


class PaymentMethodConfirmResponse(BaseModel):
    id: UUID
    card_last4: str | None = None
    card_network: str | None = None
    is_default: bool


class SetDefaultResponse(BaseModel):
    id: UUID
    is_default: bool = True


class SubscriptionOut(BaseModel):
    id: UUID
    plan: str
    price: float
    status: str
    started_at: datetime | None = None
    next_charge_at: datetime | None = None
    cancelled_at: datetime | None = None
    ends_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubscriptionCancelResponse(BaseModel):
    status: str
    ends_at: datetime | None = None
