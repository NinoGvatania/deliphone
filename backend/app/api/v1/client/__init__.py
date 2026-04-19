"""Client API (SPEC.md §14.1)."""

from fastapi import APIRouter

from app.api.v1.client.auth import router as auth_router

router = APIRouter(prefix="/client", tags=["client"])
router.include_router(auth_router)
