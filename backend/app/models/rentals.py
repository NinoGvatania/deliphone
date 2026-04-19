"""Rental, Payment, Incident models (§13.2)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class Rental(TimestampMixin, Base):
    __tablename__ = "rentals"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False, index=True
    )
    tariff_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tariffs.id"), nullable=False
    )
    issued_at_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )
    returned_at_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )

    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    booking_expires_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    activated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    paid_until: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    next_charge_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), index=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    deposit_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    deposit_payment_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("payments.id")
    )
    has_udobno_at_booking: Mapped[bool | None] = mapped_column(Boolean)

    total_charged: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, server_default="0"
    )
    debt_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, server_default="0"
    )

    contract_html: Mapped[str | None] = mapped_column(Text)
    act_issue_html: Mapped[str | None] = mapped_column(Text)
    act_return_html: Mapped[str | None] = mapped_column(Text)
    client_signature_url: Mapped[str | None] = mapped_column(Text)

    issuing_partner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_users.id")
    )
    returning_partner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_users.id")
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    rental_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("rentals.id")
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("subscriptions.id")
    )
    incident_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("incidents.id")
    )

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    counts_toward_partner_commission: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="RUB", server_default="RUB")

    provider: Mapped[str] = mapped_column(
        String(20), default="yookassa", server_default="yookassa"
    )
    provider_payment_id: Mapped[str | None] = mapped_column(String(100))
    provider_status: Mapped[str | None] = mapped_column(String(30))

    payment_method_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("payment_methods.id")
    )

    attempt_number: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    failure_reason: Mapped[str | None] = mapped_column(Text)

    captured_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    receipt_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class Incident(TimestampMixin, Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = uuid_pk()
    rental_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("rentals.id")
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("devices.id")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partners.id")
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    severity: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), nullable=False)

    reported_by: Mapped[str | None] = mapped_column(String(20))
    reported_by_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))

    description: Mapped[str | None] = mapped_column(Text)
    photo_urls: Mapped[dict | None] = mapped_column(JSONB)
    video_urls: Mapped[dict | None] = mapped_column(JSONB)

    damage_category: Mapped[str | None] = mapped_column(String(50))
    damage_subcategory: Mapped[str | None] = mapped_column(String(50))

    police_report_number: Mapped[str | None] = mapped_column(String(100))
    police_report_url: Mapped[str | None] = mapped_column(Text)

    repair_estimate: Mapped[float | None] = mapped_column(Numeric(10, 2))
    client_charge: Mapped[float | None] = mapped_column(Numeric(10, 2))
    breakdown: Mapped[dict | None] = mapped_column(JSONB)

    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("admin_users.id")
    )
    reviewer_comment: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    client_accepted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    client_disputed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dispute_reason: Mapped[str | None] = mapped_column(Text)

    resolved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    resolution_type: Mapped[str | None] = mapped_column(String(30))

    expertise_required: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    expertise_started_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    expertise_result: Mapped[str | None] = mapped_column(String(30))
    substitute_rental_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("rentals.id")
    )
