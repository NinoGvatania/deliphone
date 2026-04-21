"""Public API — open endpoints (SPEC.md §3.3)."""

from fastapi import APIRouter

from app.api.v1.public.devices import router as devices_router

router = APIRouter(prefix="/public", tags=["public"])
router.include_router(devices_router)
