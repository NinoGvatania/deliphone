"""Partner-specific request/response schemas (SPEC §6, §14.2)."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------- dashboard ----------


class DashboardResponse(BaseModel):
    awaiting_issue: int
    awaiting_return: int
    devices_total: int
    devices_free: int
    revenue_today: float
    acquisitions_today: int
    acquisition_bonus: float


# ---------- issue wizard ----------


class IssueWizardInit(BaseModel):
    rental_id: UUID
    user_name: str
    user_photo: str | None = None
    device_model: str
    device_imei: str
    device_short_code: str


class IssueScanDeviceRequest(BaseModel):
    device_qr: str | None = None
    imei: str | None = None


class IssueUploadPhotosRequest(BaseModel):
    photo_urls: list[str] = Field(..., min_length=6)


class IssueSignatureRequest(BaseModel):
    signature_url: str


# ---------- return wizard ----------


class ReturnInitRequest(BaseModel):
    device_qr: str | None = None
    imei: str | None = None


class ReturnSessionResponse(BaseModel):
    session_id: UUID
    qr_url: str
    rental_id: UUID
    user_name: str
    device_model: str
    device_short_code: str
    activated_at: datetime | None = None
    paid_until: datetime | None = None


class ReturnFrpCheckRequest(BaseModel):
    frp_cleared: bool


class ReturnChecklistRequest(BaseModel):
    items: dict[str, dict[str, str]]


class ReturnCreateIncidentRequest(BaseModel):
    category: str
    subcategory: str
    photo_urls: list[str] = []
    proposed_amount: float


class ReturnSanitizationRequest(BaseModel):
    checklist_done: bool
    photo_url: str


# ---------- inventory ----------


class InventoryDeviceBrief(BaseModel):
    id: UUID
    imei_last4: str
    model: str
    short_code: str
    custody: str | None = None
    battery_level: int | None = None
    days_on_point: int = 0

    model_config = {"from_attributes": True}


class InventoryListResponse(BaseModel):
    devices: list[InventoryDeviceBrief]
    total: int


class InventoryScanRequest(BaseModel):
    device_qr: str | None = None
    imei: str | None = None


# ---------- finance ----------


class FinanceBalanceResponse(BaseModel):
    balance: float
    revenue_today: float
    revenue_week: float
    revenue_month: float
    acquisitions_bonus: float
    penalties: float


class TransactionBrief(BaseModel):
    id: UUID
    type: str
    direction: str
    amount: float
    description: str | None = None
    created_at: datetime
    rental_id: UUID | None = None

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionBrief]
    total: int
    page: int
    size: int


class PayoutBrief(BaseModel):
    id: UUID
    period_from: date | None = None
    period_to: date | None = None
    amount: float
    status: str

    model_config = {"from_attributes": True}


# ---------- support ----------


class ChatBrief(BaseModel):
    id: UUID
    subject: str | None = None
    status: str
    last_message_preview: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class MessageBrief(BaseModel):
    id: UUID
    sender_type: str | None = None
    content: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
