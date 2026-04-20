"""Partner API (SPEC.md §14.2)."""

from fastapi import APIRouter

from app.api.v1.partner.auth import router as auth_router
from app.api.v1.partner.dashboard import router as dashboard_router
from app.api.v1.partner.finance import router as finance_router
from app.api.v1.partner.inventory import router as inventory_router
from app.api.v1.partner.issues import router as issues_router
from app.api.v1.partner.registrations import router as registrations_router
from app.api.v1.partner.returns import router as returns_router
from app.api.v1.partner.support import router as support_router

router = APIRouter(prefix="/partner", tags=["partner"])
router.include_router(auth_router)
router.include_router(registrations_router)
router.include_router(dashboard_router)
router.include_router(issues_router)
router.include_router(returns_router)
router.include_router(inventory_router)
router.include_router(finance_router)
router.include_router(support_router)
