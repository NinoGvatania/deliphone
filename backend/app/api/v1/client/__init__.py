"""Client API (SPEC.md §14.1)."""

from fastapi import APIRouter

from app.api.v1.client.auth import router as auth_router
from app.api.v1.client.me import router as me_router

router = APIRouter(prefix="/client", tags=["client"])
router.include_router(auth_router)
router.include_router(me_router)
