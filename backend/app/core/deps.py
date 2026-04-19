"""FastAPI dependencies for JWT-protected endpoints."""

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import decode_token
from app.models.users import User
from app.models.partners import PartnerUser
from app.models.admin import AdminUser

_bearer = HTTPBearer(auto_error=False)

async def _extract_token(cred: HTTPAuthorizationCredentials | None) -> dict:
    if cred is None:
        raise HTTPException(401, "missing authorization header")
    try:
        payload = decode_token(cred.credentials)
    except JWTError:
        raise HTTPException(401, "invalid or expired token")
    if payload.get("type") != "access":
        raise HTTPException(401, "invalid token type")
    return payload

async def get_current_client(
    cred=Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    payload = await _extract_token(cred)
    if payload.get("role") != "client":
        raise HTTPException(403, "client role required")
    result = await session.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalars().first()
    if not user or user.status == "blocked":
        raise HTTPException(403, "account blocked or not found")
    return user

async def get_current_partner(
    cred=Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> PartnerUser:
    payload = await _extract_token(cred)
    if payload.get("role") != "partner":
        raise HTTPException(403, "partner role required")
    result = await session.execute(select(PartnerUser).where(PartnerUser.id == payload["sub"]))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(403, "account deactivated or not found")
    return user

async def get_current_admin(
    cred=Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    payload = await _extract_token(cred)
    if payload.get("role") != "admin":
        raise HTTPException(403, "admin role required")
    result = await session.execute(select(AdminUser).where(AdminUser.id == payload["sub"]))
    admin = result.scalars().first()
    if not admin or not admin.is_active:
        raise HTTPException(403, "account deactivated or not found")
    return admin

def require_admin_role(*roles: str):
    """Dependency factory: require specific admin role(s)."""
    async def checker(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if admin.role not in roles:
            raise HTTPException(403, f"requires role: {', '.join(roles)}")
        return admin
    return checker
