"""Client API (SPEC.md §14.1)."""

from fastapi import APIRouter

from app.api.v1.client.auth import router as auth_router
from app.api.v1.client.email import router as email_router
from app.api.v1.client.incidents import router as incidents_router
from app.api.v1.client.kyc import router as kyc_router
from app.api.v1.client.locations import router as locations_router
from app.api.v1.client.me import router as me_router
from app.api.v1.client.payments import router as payments_router
from app.api.v1.client.rentals import router as rentals_router
from app.api.v1.client.subscription import router as subscription_router
from app.api.v1.client.support import router as support_router

router = APIRouter(prefix="/client", tags=["client"])
router.include_router(auth_router)
router.include_router(me_router)
router.include_router(kyc_router)
router.include_router(email_router)
router.include_router(payments_router)
router.include_router(subscription_router)
router.include_router(locations_router)
router.include_router(rentals_router)
router.include_router(incidents_router)
router.include_router(support_router)
