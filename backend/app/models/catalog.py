"""Catalog models: Tariff, Device, DeviceMovement, DamagePricing (§13.2)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

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
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, uuid_pk


class Tariff(Base):
    __tablename__ = "tariffs"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(
        String(100), default="Стандарт посуточно", server_default="Стандарт посуточно"
    )
    device_model: Mapped[str | None] = mapped_column(String(100))
    period_hours: Mapped[int] = mapped_column(Integer, default=24, server_default="24")
    price: Mapped[float] = mapped_column(
        Numeric(8, 2), default=349.00, server_default="349.00"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = uuid_pk()
    imei: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(50))
    short_code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    model: Mapped[str] = mapped_column(
        String(100), default="Xiaomi Redmi A5", server_default="Xiaomi Redmi A5"
    )
    color: Mapped[str | None] = mapped_column(String(50))
    storage: Mapped[str] = mapped_column(String(20), default="128GB", server_default="128GB")
    purchase_cost: Mapped[float] = mapped_column(
        Numeric(10, 2), default=4500.00, server_default="4500.00"
    )
    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_source: Mapped[str | None] = mapped_column(String(100))
    condition_grade: Mapped[int | None] = mapped_column(Integer)

    current_custody: Mapped[str | None] = mapped_column(String(20))
    current_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )
    current_rental_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("rentals.id")
    )

    total_rentals: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_revenue: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, server_default="0"
    )

    last_moved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    reference_photos: Mapped[dict | None] = mapped_column(JSONB)

    qr_installed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    back_cover_type: Mapped[str | None] = mapped_column(String(20))
    back_cover_installed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class DeviceMovement(Base):
    __tablename__ = "device_movements"

    id: Mapped[uuid.UUID] = uuid_pk()
    device_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False
    )
    from_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )
    to_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("partner_locations.id")
    )
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    related_rental_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("rentals.id")
    )
    initiated_by_type: Mapped[str | None] = mapped_column(String(20))
    initiated_by_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    status: Mapped[str | None] = mapped_column(String(20))
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class DamagePricing(Base):
    __tablename__ = "damage_pricing"

    id: Mapped[uuid.UUID] = uuid_pk()
    device_model: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(50))
    subcategory: Mapped[str | None] = mapped_column(String(50))
    price: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
