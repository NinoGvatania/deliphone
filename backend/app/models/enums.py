"""StrEnum definitions for every status/type field in the schema (§13.2)."""

from __future__ import annotations

from enum import StrEnum


class UserStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED_DEBT = "suspended_debt"
    BLOCKED = "blocked"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    PAYMENT_FAILED = "payment_failed"
    CANCELLED = "cancelled"


class PartnerStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    BLOCKED = "blocked"


class PartnerType(StrEnum):
    INDIVIDUAL = "individual"
    COMPANY = "company"


class PartnerLocationStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class PartnerUserRole(StrEnum):
    OPERATOR = "operator"


class RegistrationSessionStatus(StrEnum):
    PENDING = "pending"
    ATTACHED = "attached"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class AdminRole(StrEnum):
    KYC_OPERATOR = "kyc_operator"
    SUPPORT = "support"
    MANAGER = "manager"
    LOGISTICS = "logistics"
    ADMIN = "admin"


class DeviceCustody(StrEnum):
    LOCATION = "location"
    RESERVED = "reserved"
    WITH_CLIENT = "with_client"
    IN_TRANSIT = "in_transit"
    IN_PROCESSING = "in_processing"
    IN_SERVICE = "in_service"
    FRP_LOCKED = "frp_locked"
    MISSING = "missing"
    WRITTEN_OFF = "written_off"


class DeviceStatus(StrEnum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    WRITTEN_OFF = "written_off"


class DeviceMovementType(StrEnum):
    ISSUE = "issue"
    RETURN = "return"
    TRANSFER = "transfer"
    TO_SERVICE = "to_service"
    FROM_SERVICE = "from_service"
    RESTOCK = "restock"
    WRITE_OFF = "write_off"


class RentalStatus(StrEnum):
    PENDING_ACTIVATION = "pending_activation"
    ACTIVE = "active"
    GRACE_PERIOD = "grace_period"
    LOCKED_OVERDUE = "locked_overdue"
    PENDING_RETURN = "pending_return"
    CLOSED_RETURNED = "closed_returned"
    CLOSED_WITH_DEBT = "closed_with_debt"
    EXPIRED_MAX_DURATION = "expired_max_duration"
    CLOSED_INCIDENT = "closed_incident"
    CANCELLED = "cancelled"


class PaymentType(StrEnum):
    DEPOSIT_HOLD = "deposit_hold"
    DEPOSIT_CAPTURE = "deposit_capture"
    DEPOSIT_RELEASE = "deposit_release"
    DEPOSIT_REFUND = "deposit_refund"
    DAILY_CHARGE = "daily_charge"
    SUBSCRIPTION_CHARGE = "subscription_charge"
    INCIDENT_CHARGE = "incident_charge"
    DEBT_PAYMENT = "debt_payment"
    REFUND = "refund"
    MANUAL_ADJUSTMENT = "manual_adjustment"


class IncidentReporter(StrEnum):
    USER = "user"
    PARTNER = "partner"
    ADMIN = "admin"
    SYSTEM = "system"


class DebtStatus(StrEnum):
    ACTIVE = "active"
    IN_GRACE = "in_grace"
    OVERDUE = "overdue"
    IN_COLLECTIONS = "in_collections"
    SETTLED = "settled"
    WRITTEN_OFF = "written_off"


class PartnerTransactionType(StrEnum):
    RENTAL_COMMISSION = "rental_commission"
    ACQUISITION_BONUS = "acquisition_bonus"
    PENALTY = "penalty"
    ADJUSTMENT = "adjustment"
    PAYOUT = "payout"


class PartnerPayoutStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"


class InventoryAuditStatus(StrEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FOUND_DISCREPANCY = "found_discrepancy"


class SupportChatStatus(StrEnum):
    OPEN = "open"
    WAITING = "waiting"
    CLOSED = "closed"


class SupportChatPriority(StrEnum):
    NORMAL = "normal"
    HIGH = "high"


class NotificationChannel(StrEnum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"
    TELEGRAM = "telegram"
