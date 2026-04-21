"""Client auth helpers — refresh and logout only.

Primary auth (SMS) lives at /api/v1/auth/*. This module provides
token refresh and logout scoped to the /client prefix for backwards compat.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from jose import JWTError

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.schemas.auth import RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["client-auth"])


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid refresh token")

    if payload.get("type") != "refresh" or payload.get("role") != "client":
        raise HTTPException(status_code=401, detail="invalid refresh token")

    subject = payload["sub"]
    access = create_access_token(subject, "client")
    refresh = create_refresh_token(subject, "client")

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=200)
async def logout() -> dict:
    return {"ok": True}
