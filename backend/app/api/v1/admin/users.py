"""Admin user management endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog, Blacklist
from app.models.users import User
from app.schemas.admin import (
    UserDetail,
    UserListItem,
    UserListResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["admin-users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status: str | None = Query(None),
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> UserListResponse:
    base = select(User)
    count_q = select(func.count()).select_from(User)

    if search:
        like = f"%{search}%"
        flt = or_(
            User.phone_number.ilike(like),
            User.first_name.ilike(like),
            User.email.ilike(like),
        )
        base = base.where(flt)
        count_q = count_q.where(flt)

    if status:
        base = base.where(User.status == status)
        count_q = count_q.where(User.status == status)

    total = (await session.execute(count_q)).scalar() or 0
    offset = (page - 1) * size
    result = await session.execute(base.order_by(User.created_at.desc()).offset(offset).limit(size))
    users = result.scalars().all()

    return UserListResponse(
        items=[UserListItem.model_validate(u) for u in users],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: uuid.UUID,
    admin: AdminUser = Depends(require_admin_role("kyc_operator", "manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> UserDetail:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    return UserDetail.model_validate(user)


@router.patch("/{user_id}", response_model=UserDetail)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> UserDetail:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
        changes[field] = value

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        changes=changes,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(user)
    return UserDetail.model_validate(user)


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    user.status = "suspended"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.suspend",
        entity_type="user",
        entity_id=user.id,
        changes={"status": "suspended"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "suspended"}


@router.post("/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    user.status = "active"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.unsuspend",
        entity_type="user",
        entity_id=user.id,
        changes={"status": "active"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "active"}


@router.post("/{user_id}/block")
async def block_user(
    user_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    user.status = "blocked"
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.block",
        entity_type="user",
        entity_id=user.id,
        changes={"status": "blocked"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "blocked"}


@router.post("/{user_id}/forgive-debt")
async def forgive_debt(
    user_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.forgive_debt",
        entity_type="user",
        entity_id=user.id,
        changes={},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "debt_forgiven"}


@router.post("/{user_id}/blacklist")
async def blacklist_user(
    user_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")
    user.status = "blocked"
    session.add(Blacklist(
        entity_type="user",
        entity_id=user.id,
        reason="admin blacklist",
        added_by_id=admin.id,
    ))
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="user.blacklist",
        entity_type="user",
        entity_id=user.id,
        changes={"status": "blocked"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return {"status": "blacklisted"}
