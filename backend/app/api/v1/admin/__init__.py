"""Admin API (SPEC.md §14.3)."""

from fastapi import APIRouter

from app.api.v1.admin.analytics import router as analytics_router
from app.api.v1.admin.audit_log import router as audit_log_router
from app.api.v1.admin.mdm import router as mdm_router
from app.api.v1.admin.audits import router as audits_router
from app.api.v1.admin.auth import router as auth_router
from app.api.v1.admin.dashboard import router as dashboard_router
from app.api.v1.admin.devices import router as devices_router
from app.api.v1.admin.finance import router as finance_router
from app.api.v1.admin.incidents import router as incidents_router
from app.api.v1.admin.kyc import router as kyc_router
from app.api.v1.admin.locations import router as locations_router
from app.api.v1.admin.logistics import router as logistics_router
from app.api.v1.admin.partners import router as partners_router
from app.api.v1.admin.rentals import router as rentals_router
from app.api.v1.admin.service import router as service_router
from app.api.v1.admin.settings import router as settings_router
from app.api.v1.admin.subscriptions import router as subscriptions_router
from app.api.v1.admin.support import router as support_router
from app.api.v1.admin.users import router as users_router

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(auth_router)
router.include_router(kyc_router)
router.include_router(dashboard_router)
router.include_router(users_router)
router.include_router(subscriptions_router)
router.include_router(devices_router)
router.include_router(rentals_router)
router.include_router(incidents_router)
router.include_router(partners_router)
router.include_router(locations_router)
router.include_router(audits_router)
router.include_router(service_router)
router.include_router(logistics_router)
router.include_router(finance_router)
router.include_router(settings_router)
router.include_router(audit_log_router)
router.include_router(analytics_router)
router.include_router(support_router)
router.include_router(mdm_router)
