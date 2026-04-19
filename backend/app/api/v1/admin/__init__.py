"""Admin API (SPEC.md §14.3)."""

from fastapi import APIRouter

from app.api.v1.admin.auth import router as auth_router
from app.api.v1.admin.kyc import router as kyc_router

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(auth_router)
router.include_router(kyc_router)
