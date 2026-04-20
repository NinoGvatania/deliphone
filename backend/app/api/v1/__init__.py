"""API v1 aggregator.

Sub-routers follow the split from SPEC.md §3.3:
  /api/v1/client   — courier-facing PWA
  /api/v1/partner  — partner tablet PWA
  /api/v1/admin    — employee back office
  /api/v1/public   — open endpoints (locations, offer)
  /api/v1/webhooks — provider callbacks (ЮKassa, etc.)
"""

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.client import router as client_router
from app.api.v1.partner import router as partner_router
from app.api.v1.public import router as public_router
from app.api.v1.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(client_router)
api_router.include_router(partner_router)
api_router.include_router(admin_router)
api_router.include_router(public_router)
api_router.include_router(webhooks_router)

__all__ = ["api_router"]
