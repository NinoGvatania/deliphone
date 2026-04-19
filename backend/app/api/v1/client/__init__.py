"""Client API (SPEC.md §14.1)."""

from fastapi import APIRouter

from app.api.v1.client.auth import router as auth_router
from app.api.v1.client.email import router as email_router
from app.api.v1.client.kyc import router as kyc_router
from app.api.v1.client.me import router as me_router
from app.api.v1.client.payments import router as payments_router

router = APIRouter(prefix="/client", tags=["client"])
router.include_router(auth_router)
router.include_router(me_router)
router.include_router(kyc_router)
router.include_router(email_router)
router.include_router(payments_router)
