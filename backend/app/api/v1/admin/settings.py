"""Admin settings/configuration endpoints (SPEC §7, §14.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import require_admin_role
from app.models.admin import AdminUser
from app.models.catalog import Tariff
from app.models.ops import AuditLog
from app.schemas.admin import (
    NotificationTemplatesResponse,
    NotificationTemplatesUpdateRequest,
    ParametersResponse,
    ParametersUpdateRequest,
    TariffCreateRequest,
    TariffItem,
    TariffUpdateRequest,
)

router = APIRouter(prefix="/settings", tags=["admin-settings"])


# --- Tariffs ---


@router.get("/tariffs", response_model=list[TariffItem])
async def list_tariffs(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[TariffItem]:
    result = await session.execute(select(Tariff).order_by(Tariff.created_at.desc()))
    tariffs = result.scalars().all()
    return [TariffItem.model_validate(t) for t in tariffs]


@router.post("/tariffs", response_model=TariffItem)
async def create_tariff(
    body: TariffCreateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> TariffItem:
    tariff = Tariff(
        name=body.name,
        device_model=body.device_model,
        period_hours=body.period_hours,
        price=body.price,
    )
    session.add(tariff)
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="settings.tariff.create",
        entity_type="tariff",
        entity_id=tariff.id,
        changes=body.model_dump(),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(tariff)
    return TariffItem.model_validate(tariff)


@router.patch("/tariffs/{tariff_id}", response_model=TariffItem)
async def update_tariff(
    tariff_id: uuid.UUID,
    body: TariffUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> TariffItem:
    result = await session.execute(select(Tariff).where(Tariff.id == tariff_id))
    tariff = result.scalars().first()
    if not tariff:
        raise HTTPException(404, "tariff not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tariff, field, value)
        changes[field] = value

    session.add(AuditLog(
        admin_user_id=admin.id,
        action="settings.tariff.update",
        entity_type="tariff",
        entity_id=tariff.id,
        changes=changes,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    await session.refresh(tariff)
    return TariffItem.model_validate(tariff)


# --- Parameters (app-wide config key-value) ---


@router.get("/parameters", response_model=ParametersResponse)
async def get_parameters(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ParametersResponse:
    # Placeholder: real implementation reads from a config table
    return ParametersResponse(params={})


@router.patch("/parameters", response_model=ParametersResponse)
async def update_parameters(
    body: ParametersUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> ParametersResponse:
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="settings.parameters.update",
        entity_type="parameters",
        entity_id=None,
        changes=body.params,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return ParametersResponse(params=body.params)


# --- Notification Templates ---


@router.get("/notification-templates", response_model=NotificationTemplatesResponse)
async def get_notification_templates(
    admin: AdminUser = Depends(require_admin_role("manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> NotificationTemplatesResponse:
    # Placeholder: real implementation reads from a templates table
    return NotificationTemplatesResponse(templates={})


@router.patch("/notification-templates", response_model=NotificationTemplatesResponse)
async def update_notification_templates(
    body: NotificationTemplatesUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> NotificationTemplatesResponse:
    session.add(AuditLog(
        admin_user_id=admin.id,
        action="settings.notification_templates.update",
        entity_type="notification_templates",
        entity_id=None,
        changes=body.templates,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))
    await session.commit()
    return NotificationTemplatesResponse(templates=body.templates)
