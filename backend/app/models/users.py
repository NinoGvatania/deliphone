"""User-facing models: User, KycSubmission, PaymentMethod, Subscription (§13.2).

User auth is Telegram-only — no phone/SMS fields.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    TIMESTAMP,
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.crypto import EncryptedString
from app.models.base import Base, TimestampMixin, uuid_pk


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    telegram_username: Mapped[str | None] = mapped_column(String(100))
    telegram_first_name: Mapped[str | None] = mapped_column(String(100))
    telegram_last_name: Mapped[str | None] = mapped_column(String(100))
    telegram_photo_url: Mapped[str | None] = mapped_column(Text)

    email: Mapped[str | None] = mapped_column(String(255))
    email_for_receipts: Mapped[str | None] = mapped_column(String(255))

    kyc_status: Mapped[str] = mapped_column(String(32), default="none", server_default="none")
    kyc_submission_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("kyc_submissions.id")
    )
    status: Mapped[str] = mapped_column(String(32), default="active", server_default="active")
    blocked_reason: Mapped[str | None] = mapped_column(Text)

    # KYC fields (AES-256-GCM encrypted at application level via EncryptedString)
    full_name: Mapped[str | None] = mapped_column(EncryptedString(255))
    birth_date: Mapped[date | None] = mapped_column(Date)
    passport_series: Mapped[str | None] = mapped_column(EncryptedString(255))
    passport_number: Mapped[str | None] = mapped_column(EncryptedString(255))
    passport_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    passport_issued_by: Mapped[str | None] = mapped_column(EncryptedString(255))
    passport_issue_date: Mapped[str | None] = mapped_column(EncryptedString(64))
    registration_address: Mapped[str | None] = mapped_column(EncryptedString(512))

    no_show_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_rentals: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    registered_at_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )

    # relationships
    kyc_submission: Mapped[KycSubmission | None] = relationship(
        "KycSubmission", foreign_keys=[kyc_submission_id], lazy="selectin"
    )
    payment_methods: Mapped[list[PaymentMethod]] = relationship(
        "PaymentMethod", back_populates="user", lazy="selectin"
    )
    subscription: Mapped[Subscription | None] = relationship(
        "Subscription", back_populates="user", uselist=False, lazy="selectin"
    )


class KycSubmission(Base):
    __tablename__ = "kyc_submissions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    passport_main_url: Mapped[str | None] = mapped_column(Text)
    passport_reg_url: Mapped[str | None] = mapped_column(Text)
    selfie_url: Mapped[str | None] = mapped_column(Text)
    video_url: Mapped[str | None] = mapped_column(Text)
    submitted_via: Mapped[str | None] = mapped_column(String(20))
    submitted_by_partner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_users.id")
    )
    auto_flags: Mapped[dict | None] = mapped_column(JSONB)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("admin_users.id")
    )
    reviewer_comment: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    consents: Mapped[dict | None] = mapped_column(JSONB)
    resubmit_requested_files: Mapped[dict | None] = mapped_column(JSONB)
    previous_submission_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("kyc_submissions.id")
    )
    submitted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    yookassa_token: Mapped[str | None] = mapped_column(String(255))
    card_last4: Mapped[str | None] = mapped_column(String(4))
    card_network: Mapped[str | None] = mapped_column(String(20))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    expires_at: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="payment_methods")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    plan: Mapped[str] = mapped_column(String(20), default="udobno", server_default="udobno")
    price: Mapped[float] = mapped_column(Numeric(8, 2), default=199.00, server_default="199.00")
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    next_charge_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    total_paid: Mapped[float] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    payment_failures_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="subscription")
