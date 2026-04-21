"""Rental, location, and incident request/response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LocationBrief(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    status: str
    lat: float | None = None
    lng: float | None = None
    available_devices: int = 0

    model_config = {"from_attributes": True}


class LocationDetail(LocationBrief):
    working_hours: dict | None = None
    contacts: dict | None = None
    photo_url: str | None = None
    capacity: int = 0


class DeviceBrief(BaseModel):
    id: UUID
    model: str
    short_code: str
    color: str | None = None
    storage: str
    condition_grade: int | None = None

    model_config = {"from_attributes": True}


class RentalCreateRequest(BaseModel):
    device_id: UUID
    location_id: UUID
    with_udobno_subscription: bool = False


class RentalBrief(BaseModel):
    id: UUID
    status: str
    device: DeviceBrief | None = None
    location_name: str | None = None
    activated_at: datetime | None = None
    paid_until: datetime | None = None
    next_charge_at: datetime | None = None
    deposit_amount: float | None = None
    total_charged: float = 0
    debt_amount: float = 0
    booking_expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class RentalDetail(RentalBrief):
    created_at: datetime | None = None
    closed_at: datetime | None = None
    has_udobno_at_booking: bool | None = None


class RentalListResponse(BaseModel):
    items: list[RentalBrief]
    total: int


class ConfirmPickupResponse(BaseModel):
    status: str
    activated_at: datetime
    paid_until: datetime


class IncidentCreateRequest(BaseModel):
    type: str
    description: str
    photo_urls: list[str] = []


class IncidentBrief(BaseModel):
    id: UUID
    type: str
    status: str
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
