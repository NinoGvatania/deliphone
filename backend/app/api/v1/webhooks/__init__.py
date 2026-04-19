"""Provider webhooks (SPEC.md §14.4): YooKassa payment/refund events."""

from fastapi import APIRouter

from app.api.v1.webhooks.yookassa import router as yookassa_router

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
router.include_router(yookassa_router)
