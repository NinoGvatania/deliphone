"""Public auth endpoints — SMS-based registration and login."""

from fastapi import APIRouter

from app.api.v1.auth.sms_auth import router as sms_router

router = APIRouter(prefix="/auth", tags=["auth"])
router.include_router(sms_router)
