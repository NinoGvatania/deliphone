"""Partner API (SPEC.md §14.2)."""

from fastapi import APIRouter

from app.api.v1.partner.auth import router as auth_router

router = APIRouter(prefix="/partner", tags=["partner"])
router.include_router(auth_router)
