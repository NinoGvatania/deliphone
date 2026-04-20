"""ORM models registry — all entities from SPEC.md §13.2."""

from app.core.db import Base
from app.models.admin import AdminUser
from app.models.catalog import Device, DeviceMovement, Tariff
from app.models.enums import (
    AdminRole,
    DebtStatus,
    DeviceCustody,
    DeviceMovementType,
    DeviceStatus,
    IncidentReporter,
    InventoryAuditStatus,
    NotificationChannel,
    PartnerLocationStatus,
    PartnerPayoutStatus,
    PartnerStatus,
    PartnerTransactionType,
    PartnerType,
    PartnerUserRole,
    PaymentType,
    RegistrationSessionStatus,
    RentalStatus,
    SubscriptionStatus,
    SupportChatPriority,
    SupportChatStatus,
    UserStatus,
)
from app.models.finance import Debt, PartnerPayout, PartnerTransaction
from app.models.ops import (
    AuditLog,
    Blacklist,
    InventoryAudit,
    Notification,
    SupportChat,
    SupportMessage,
)
from app.models.partners import Partner, PartnerLocation, PartnerUser, RegistrationSession
from app.models.rentals import Incident, Payment, Rental
from app.models.users import PaymentMethod, Subscription, User
from app.models.webhooks import WebhookEvent

__all__ = [
    "Base",
    # enums
    "AdminRole",
    "DebtStatus",
    "DeviceCustody",
    "DeviceMovementType",
    "DeviceStatus",
    "IncidentReporter",
    "InventoryAuditStatus",
    "NotificationChannel",
    "PartnerLocationStatus",
    "PartnerPayoutStatus",
    "PartnerStatus",
    "PartnerTransactionType",
    "PartnerType",
    "PartnerUserRole",
    "PaymentType",
    "RegistrationSessionStatus",
    "RentalStatus",
    "SubscriptionStatus",
    "SupportChatPriority",
    "SupportChatStatus",
    "UserStatus",
    # models
    "AdminUser",
    "AuditLog",
    "Blacklist",
    "Debt",
    "Device",
    "DeviceMovement",
    "Incident",
    "InventoryAudit",
    "Notification",
    "Partner",
    "PartnerLocation",
    "PartnerPayout",
    "PartnerTransaction",
    "PartnerUser",
    "Payment",
    "PaymentMethod",
    "RegistrationSession",
    "Rental",
    "Subscription",
    "SupportChat",
    "SupportMessage",
    "Tariff",
    "User",
    "WebhookEvent",
]
