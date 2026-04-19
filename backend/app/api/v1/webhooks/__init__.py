"""Provider webhooks (SPEC.md §14.4): ЮKassa payment/refund events."""

from fastapi import APIRouter

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
