"""Client API (SPEC.md §14.1). Endpoints land here in later phases."""

from fastapi import APIRouter

router = APIRouter(prefix="/client", tags=["client"])
