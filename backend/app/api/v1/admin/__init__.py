"""Admin API (SPEC.md §14.3). Endpoints land here in later phases."""

from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])
