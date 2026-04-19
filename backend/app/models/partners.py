"""Partner models: Partner, PartnerUser, PartnerLocation, RegistrationSession (§13.2)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    TIMESTAMP,
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

from app.models.base import Base, TimestampMixin, uuid_pk


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = uuid_pk()
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    inn: Mapped[str | None] = mapped_column(String(12))
    ogrn: Mapped[str | None] = mapped_column(String(15))
    kpp: Mapped[str | None] = mapped_column(String(9))
    type: Mapped[str | None] = mapped_column(String(20))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    bank_account: Mapped[str | None] = mapped_column(String(50))
    bank_bic: Mapped[str | None] = mapped_column(String(10))
    contract_number: Mapped[str | None] = mapped_column(String(50))
    contract_signed_at: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active")
    rating: Mapped[float] = mapped_column(
        Numeric(5, 2), default=70.00, server_default="70.00"
    )
    device_limit: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    locations: Mapped[list[PartnerLocation]] = relationship(
        "PartnerLocation", back_populates="partner", lazy="selectin"
    )
    users: Mapped[list[PartnerUser]] = relationship(
        "PartnerUser", back_populates="partner", lazy="selectin"
    )


class PartnerUser(Base):
    __tablename__ = "partner_users"

    id: Mapped[uuid.UUID] = uuid_pk()
    partner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partners.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), default="operator", server_default="operator"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    partner: Mapped[Partner] = relationship("Partner", back_populates="users")


class PartnerLocation(Base):
    __tablename__ = "partner_locations"

    id: Mapped[uuid.UUID] = uuid_pk()
    partner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partners.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    coordinates = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )
    city: Mapped[str | None] = mapped_column(String(100))
    working_hours: Mapped[dict | None] = mapped_column(JSONB)
    contacts: Mapped[dict | None] = mapped_column(JSONB)
    photo_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active")
    capacity: Mapped[int] = mapped_column(Integer, default=10, server_default="10")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    partner: Mapped[Partner] = relationship("Partner", back_populates="locations")


class RegistrationSession(TimestampMixin, Base):
    """Kiosk registration session — links a partner scan to a Telegram user."""

    __tablename__ = "registration_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    partner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partners.id"), nullable=False
    )
    partner_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_users.id"), nullable=False
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default="pending", server_default="pending"
    )
    attached_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
