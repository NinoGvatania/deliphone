"""Partner API (SPEC.md §14.2). Endpoints land here in later phases."""

from fastapi import APIRouter

router = APIRouter(prefix="/partner", tags=["partner"])
