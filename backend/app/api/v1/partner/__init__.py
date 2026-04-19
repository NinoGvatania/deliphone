"""Partner API (SPEC.md §14.2)."""

from fastapi import APIRouter

from app.api.v1.partner.auth import router as auth_router
from app.api.v1.partner.clients import router as clients_router
from app.api.v1.partner.registrations import router as registrations_router

router = APIRouter(prefix="/partner", tags=["partner"])
router.include_router(auth_router)
router.include_router(registrations_router)
router.include_router(clients_router)
