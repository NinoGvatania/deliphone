"""Admin-specific request/response schemas (SPEC §7, §14.3)."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------- pagination ----------


class PaginatedParams(BaseModel):
    page: int = 1
    size: int = 20


class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int


# ---------- dashboard ----------


class DashboardKPI(BaseModel):
    active_rentals: int = 0
    open_incidents: int = 0
    devices_total: int = 0
    devices_free: int = 0
    revenue_today: float = 0.0


class FinanceLineItem(BaseModel):
    label: str
    amount: float


class FinanceReport(BaseModel):
    period: str
    revenue_rentals: float = 0.0
    revenue_subscriptions: float = 0.0
    revenue_penalties: float = 0.0
    total_revenue: float = 0.0
    expense_tax_usn: float = 0.0
    expense_yookassa: float = 0.0
    expense_partner_commission: float = 0.0
    expense_bonuses: float = 0.0
    expense_amortization: float = 0.0
    expense_repairs: float = 0.0
    expense_losses: float = 0.0
    expense_opex: float = 0.0
    total_expenses: float = 0.0
    net_profit: float = 0.0
    margin_pct: float = 0.0


class MetricsData(BaseModel):
    revenue_by_day: list[dict] = []
    registrations_by_day: list[dict] = []
    funnel: dict = {}
    utilization: dict = {}


class AlertItem(BaseModel):
    id: str
    type: str
    message: str
    severity: str = "warning"
    created_at: datetime | None = None


# ---------- users ----------


class UserListItem(BaseModel):
    id: UUID
    telegram_id: int
    telegram_username: str | None = None
    telegram_first_name: str | None = None
    telegram_last_name: str | None = None
    kyc_status: str
    status: str
    total_rentals: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserListResponse(PaginatedResponse):
    items: list[UserListItem]


class UserDetail(BaseModel):
    id: UUID
    telegram_id: int
    telegram_username: str | None = None
    telegram_first_name: str | None = None
    telegram_last_name: str | None = None
    email: str | None = None
    kyc_status: str
    status: str
    blocked_reason: str | None = None
    full_name: str | None = None
    birth_date: date | None = None
    no_show_count: int = 0
    total_rentals: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    status: str | None = None
    blocked_reason: str | None = None
    email: str | None = None


# ---------- subscriptions ----------


class SubscriptionListItem(BaseModel):
    id: UUID
    user_id: UUID
    plan: str
    price: float
    status: str
    started_at: datetime | None = None
    next_charge_at: datetime | None = None
    cancelled_at: datetime | None = None
    total_paid: float = 0.0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubscriptionListResponse(PaginatedResponse):
    items: list[SubscriptionListItem]
    churn_rate: float = 0.0
    avg_lifetime_days: float = 0.0
    total_revenue: float = 0.0


# ---------- devices ----------


class DeviceListItem(BaseModel):
    id: UUID
    imei: str
    serial_number: str | None = None
    short_code: str
    model: str
    color: str | None = None
    storage: str
    condition_grade: int | None = None
    current_custody: str | None = None
    current_location_id: UUID | None = None
    status: str
    total_rentals: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DeviceListResponse(PaginatedResponse):
    items: list[DeviceListItem]


class DeviceDetail(BaseModel):
    id: UUID
    imei: str
    serial_number: str | None = None
    short_code: str
    model: str
    color: str | None = None
    storage: str
    purchase_cost: float = 0.0
    purchase_date: date | None = None
    condition_grade: int | None = None
    current_custody: str | None = None
    current_location_id: UUID | None = None
    current_rental_id: UUID | None = None
    total_rentals: int = 0
    total_revenue: float = 0.0
    reference_photos: dict | None = None
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DeviceCreateRequest(BaseModel):
    imei: str
    model: str = "Xiaomi Redmi A5"
    serial_number: str | None = None
    short_code: str
    color: str | None = None
    storage: str = "128GB"
    condition_grade: int | None = None
    purchase_cost: float = 4500.0
    purchase_date: date | None = None
    current_location_id: UUID | None = None
    reference_photos: dict | None = None


class DeviceUpdateRequest(BaseModel):
    model: str | None = None
    color: str | None = None
    storage: str | None = None
    condition_grade: int | None = None
    status: str | None = None
    reference_photos: dict | None = None


class DeviceMoveRequest(BaseModel):
    to_location_id: UUID
    notes: str | None = None


# ---------- rentals ----------


class RentalListItem(BaseModel):
    id: UUID
    user_id: UUID
    device_id: UUID
    status: str
    activated_at: datetime | None = None
    paid_until: datetime | None = None
    closed_at: datetime | None = None
    deposit_amount: float | None = None
    total_charged: float = 0.0
    debt_amount: float = 0.0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class RentalListResponse(PaginatedResponse):
    items: list[RentalListItem]


class RentalTimeline(BaseModel):
    id: UUID
    user_id: UUID
    device_id: UUID
    tariff_id: UUID
    status: str
    booking_expires_at: datetime | None = None
    activated_at: datetime | None = None
    paid_until: datetime | None = None
    next_charge_at: datetime | None = None
    closed_at: datetime | None = None
    deposit_amount: float | None = None
    total_charged: float = 0.0
    debt_amount: float = 0.0
    has_udobno_at_booking: bool | None = None
    issued_at_location_id: UUID | None = None
    returned_at_location_id: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class RentalExtendRequest(BaseModel):
    paid_until: datetime


class RentalDiscountRequest(BaseModel):
    discount_amount: float
    reason: str


# ---------- incidents ----------


class IncidentListItem(BaseModel):
    id: UUID
    rental_id: UUID | None = None
    device_id: UUID | None = None
    user_id: UUID | None = None
    type: str
    severity: str | None = None
    status: str
    description: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class IncidentListResponse(PaginatedResponse):
    items: list[IncidentListItem]


class IncidentDetail(BaseModel):
    id: UUID
    rental_id: UUID | None = None
    device_id: UUID | None = None
    user_id: UUID | None = None
    partner_id: UUID | None = None
    location_id: UUID | None = None
    type: str
    severity: str | None = None
    status: str
    reported_by: str | None = None
    description: str | None = None
    photo_urls: dict | None = None
    damage_category: str | None = None
    damage_subcategory: str | None = None
    repair_estimate: float | None = None
    client_charge: float | None = None
    breakdown: dict | None = None
    reviewer_id: UUID | None = None
    reviewer_comment: str | None = None
    reviewed_at: datetime | None = None
    resolved_at: datetime | None = None
    resolution_type: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class IncidentAssignRequest(BaseModel):
    admin_user_id: UUID


class IncidentUpdateQuoteRequest(BaseModel):
    repair_estimate: float
    client_charge: float
    breakdown: dict | None = None


class IncidentResolveRequest(BaseModel):
    resolution_type: str
    reviewer_comment: str | None = None


# ---------- partners ----------


class PartnerListItem(BaseModel):
    id: UUID
    legal_name: str
    inn: str | None = None
    type: str | None = None
    status: str
    rating: float = 70.0
    balance: float = 0.0
    device_limit: int = 5
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PartnerListResponse(PaginatedResponse):
    items: list[PartnerListItem]


class PartnerDetail(BaseModel):
    id: UUID
    legal_name: str
    inn: str | None = None
    ogrn: str | None = None
    kpp: str | None = None
    type: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    bank_account: str | None = None
    bank_bic: str | None = None
    contract_number: str | None = None
    contract_signed_at: date | None = None
    status: str
    rating: float = 70.0
    device_limit: int = 5
    balance: float = 0.0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PartnerUpdateRequest(BaseModel):
    legal_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    bank_account: str | None = None
    bank_bic: str | None = None
    device_limit: int | None = None
    rating: float | None = None
    status: str | None = None


class PartnerAdjustmentRequest(BaseModel):
    amount: float
    type: str  # bonus or penalty
    description: str | None = None


# ---------- locations ----------


class LocationListItem(BaseModel):
    id: UUID
    partner_id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    status: str
    capacity: int = 10
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class LocationListResponse(PaginatedResponse):
    items: list[LocationListItem]


class LocationDetail(BaseModel):
    id: UUID
    partner_id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    working_hours: dict | None = None
    contacts: dict | None = None
    photo_url: str | None = None
    status: str
    capacity: int = 10
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class LocationCreateRequest(BaseModel):
    partner_id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    working_hours: dict | None = None
    contacts: dict | None = None
    photo_url: str | None = None
    capacity: int = 10
    lat: float | None = None
    lng: float | None = None


class LocationUpdateRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    working_hours: dict | None = None
    contacts: dict | None = None
    photo_url: str | None = None
    capacity: int | None = None
    status: str | None = None


# ---------- audits (inventory) ----------


class AuditListItem(BaseModel):
    id: UUID
    partner_id: UUID
    location_id: UUID
    status: str
    scheduled_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuditListResponse(PaginatedResponse):
    items: list[AuditListItem]


class AuditDetail(BaseModel):
    id: UUID
    partner_id: UUID
    location_id: UUID
    initiated_by_id: UUID
    status: str
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    expected_devices: dict | None = None
    found_devices: dict | None = None
    missing_devices: dict | None = None
    notes: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuditCreateRequest(BaseModel):
    partner_id: UUID
    location_id: UUID
    scheduled_at: datetime | None = None
    notes: str | None = None


# ---------- service ----------


class ServiceDeviceItem(BaseModel):
    id: UUID
    imei: str
    short_code: str
    model: str
    status: str
    condition_grade: int | None = None

    model_config = {"from_attributes": True}


class ServiceStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


# ---------- logistics ----------


class LogisticsLocationData(BaseModel):
    id: UUID
    name: str
    city: str | None = None
    device_count: int = 0
    capacity: int = 0
    surplus: int = 0


class MovementListItem(BaseModel):
    id: UUID
    device_id: UUID
    from_location_id: UUID | None = None
    to_location_id: UUID | None = None
    movement_type: str
    status: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- finance ----------


class FinanceOverview(BaseModel):
    total_revenue: float = 0.0
    total_payouts: float = 0.0
    total_debts: float = 0.0
    active_subscriptions_revenue: float = 0.0


class TransactionListItem(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    amount: float
    provider_status: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class TransactionListResponse(PaginatedResponse):
    items: list[TransactionListItem]


class DebtListItem(BaseModel):
    id: UUID
    user_id: UUID
    amount: float
    amount_paid: float = 0.0
    status: str
    origin_type: str | None = None
    due_date: date | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DebtListResponse(PaginatedResponse):
    items: list[DebtListItem]


class PartnerPayoutListItem(BaseModel):
    id: UUID
    partner_id: UUID
    amount: float
    status: str
    period_from: date | None = None
    period_to: date | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- settings ----------


class TariffItem(BaseModel):
    id: UUID
    name: str
    device_model: str | None = None
    period_hours: int = 24
    price: float = 349.0
    is_active: bool = True

    model_config = {"from_attributes": True}


class TariffCreateRequest(BaseModel):
    name: str
    device_model: str | None = None
    period_hours: int = 24
    price: float = 349.0


class TariffUpdateRequest(BaseModel):
    name: str | None = None
    device_model: str | None = None
    period_hours: int | None = None
    price: float | None = None
    is_active: bool | None = None


class DamagePricingItem(BaseModel):
    id: UUID
    device_model: str | None = None
    category: str | None = None
    subcategory: str | None = None
    price: float
    is_active: bool = True

    model_config = {"from_attributes": True}


class DamagePricingCreateRequest(BaseModel):
    device_model: str | None = None
    category: str | None = None
    subcategory: str | None = None
    price: float


class DamagePricingUpdateRequest(BaseModel):
    price: float | None = None
    is_active: bool | None = None


class ParametersResponse(BaseModel):
    params: dict


class ParametersUpdateRequest(BaseModel):
    params: dict


class NotificationTemplatesResponse(BaseModel):
    templates: dict


class NotificationTemplatesUpdateRequest(BaseModel):
    templates: dict


# ---------- audit log ----------


class AuditLogEntry(BaseModel):
    id: UUID
    admin_user_id: UUID | None = None
    action: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    changes: dict | None = None
    ip: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuditLogListResponse(PaginatedResponse):
    items: list[AuditLogEntry]


# ---------- analytics ----------


class CohortData(BaseModel):
    cohorts: list[dict] = []


class UtilizationData(BaseModel):
    overall_rate: float = 0.0
    by_location: list[dict] = []
    by_model: list[dict] = []


class PartnerRankingItem(BaseModel):
    partner_id: UUID
    legal_name: str
    rating: float
    devices_count: int = 0
    revenue: float = 0.0


class ProfitabilityData(BaseModel):
    by_device_model: list[dict] = []
    by_location: list[dict] = []


class LtvData(BaseModel):
    avg_ltv: float = 0.0
    avg_cac: float = 0.0
    retention_30d: float = 0.0
    retention_90d: float = 0.0
