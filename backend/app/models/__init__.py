"""ORM models registry — all entities from SPEC.md §13.2."""

from app.core.db import Base
from app.models.admin import AdminUser
from app.models.catalog import DamagePricing, Device, DeviceMovement, Tariff
from app.models.enums import (
    AdminRole,
    DebtStatus,
    DeviceCustody,
    DeviceMovementType,
    DeviceStatus,
    IncidentReporter,
    InventoryAuditStatus,
    KycStatus,
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
from app.models.users import KycSubmission, PaymentMethod, Subscription, User

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
    "KycStatus",
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
    "DamagePricing",
    "Debt",
    "Device",
    "DeviceMovement",
    "Incident",
    "InventoryAudit",
    "KycSubmission",
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
]
