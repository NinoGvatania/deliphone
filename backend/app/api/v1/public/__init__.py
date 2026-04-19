"""Public API — open endpoints (SPEC.md §3.3)."""

from fastapi import APIRouter

router = APIRouter(prefix="/public", tags=["public"])
