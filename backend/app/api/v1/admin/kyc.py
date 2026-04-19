"""Admin KYC moderation endpoints (SPEC.md §7, §14.3)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_admin, require_admin_role
from app.models.admin import AdminUser
from app.models.ops import AuditLog
from app.models.users import KycSubmission, User
from app.schemas.kyc import (
    KycDetailResponse,
    KycQueueItem,
    KycQueueResponse,
    KycRejectRequest,
    KycRequestResubmitRequest,
)
from app.services.notifications import (
    notify_kyc_approved,
    notify_kyc_rejected,
    notify_kyc_resubmit_requested,
)
from app.services.storage import get_storage

router = APIRouter(prefix="/kyc", tags=["admin-kyc"])

KYC_BUCKET = "kyc-documents"


@router.get("/queue", response_model=KycQueueResponse)
async def kyc_queue(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> KycQueueResponse:
    base_query = (
        select(KycSubmission, User.telegram_first_name, User.telegram_last_name)
        .join(User, KycSubmission.user_id == User.id)
    )
    count_query = select(func.count()).select_from(KycSubmission)

    if status:
        base_query = base_query.where(KycSubmission.status == status)
        count_query = count_query.where(KycSubmission.status == status)

    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    result = await session.execute(
        base_query.order_by(KycSubmission.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    rows = result.all()

    items = []
    for submission, tg_first, tg_last in rows:
        items.append(KycQueueItem(
            id=submission.id,
            user_id=submission.user_id,
            status=submission.status,
            submitted_via=submission.submitted_via,
            auto_flags=submission.auto_flags,
            submitted_at=submission.submitted_at.isoformat() if submission.submitted_at else None,
            telegram_first_name=tg_first,
            telegram_last_name=tg_last,
        ))

    return KycQueueResponse(items=items, total=total, page=page, size=size)


@router.get("/{submission_id}", response_model=KycDetailResponse)
async def kyc_detail(
    submission_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> KycDetailResponse:
    result = await session.execute(
        select(KycSubmission).where(KycSubmission.id == submission_id)
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")

    storage = get_storage()
    photo_urls: dict[str, str] = {}
    for field in ("passport_main_url", "passport_reg_url", "selfie_url", "video_url"):
        key = getattr(submission, field)
        if key:
            display_name = field.replace("_url", "")
            photo_urls[display_name] = storage.generate_read_url(KYC_BUCKET, key)

    return KycDetailResponse(
        id=submission.id,
        user_id=submission.user_id,
        status=submission.status,
        submitted_via=submission.submitted_via,
        auto_flags=submission.auto_flags,
        consents=submission.consents,
        reviewer_comment=submission.reviewer_comment,
        rejection_reason=submission.rejection_reason,
        resubmit_requested_files=submission.resubmit_requested_files,
        submitted_at=submission.submitted_at.isoformat() if submission.submitted_at else None,
        reviewed_at=submission.reviewed_at.isoformat() if submission.reviewed_at else None,
        photo_urls=photo_urls,
    )


@router.post("/{submission_id}/approve")
async def kyc_approve(
    submission_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("kyc_operator", "manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(KycSubmission).where(KycSubmission.id == submission_id)
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")
    if submission.status != "pending":
        raise HTTPException(409, "submission is not in pending status")

    now = datetime.now(UTC)
    submission.status = "approved"
    submission.reviewed_at = now
    submission.reviewer_id = admin.id

    user_result = await session.execute(
        select(User).where(User.id == submission.user_id)
    )
    user = user_result.scalars().first()
    if user:
        user.kyc_status = "approved"

    audit = AuditLog(
        admin_user_id=admin.id,
        action="kyc.approve",
        entity_type="kyc_submission",
        entity_id=submission.id,
        changes={"status": "approved"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(audit)

    if user:
        await notify_kyc_approved(session, user)

    await session.commit()
    return {"status": "approved"}


@router.post("/{submission_id}/reject")
async def kyc_reject(
    submission_id: uuid.UUID,
    body: KycRejectRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("kyc_operator", "manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(KycSubmission).where(KycSubmission.id == submission_id)
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")
    if submission.status != "pending":
        raise HTTPException(409, "submission is not in pending status")

    now = datetime.now(UTC)
    submission.status = "rejected"
    submission.rejection_reason = f"{body.reason_code}: {body.reason_text}"
    submission.reviewed_at = now
    submission.reviewer_id = admin.id

    user_result = await session.execute(
        select(User).where(User.id == submission.user_id)
    )
    user = user_result.scalars().first()
    if user:
        user.kyc_status = "rejected"

    audit = AuditLog(
        admin_user_id=admin.id,
        action="kyc.reject",
        entity_type="kyc_submission",
        entity_id=submission.id,
        changes={"status": "rejected", "reason_code": body.reason_code},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(audit)

    if user:
        await notify_kyc_rejected(session, user, submission.rejection_reason)

    await session.commit()
    return {"status": "rejected"}


@router.post("/{submission_id}/request-resubmit")
async def kyc_request_resubmit(
    submission_id: uuid.UUID,
    body: KycRequestResubmitRequest,
    request: Request,
    admin: AdminUser = Depends(require_admin_role("kyc_operator", "manager", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        select(KycSubmission).where(KycSubmission.id == submission_id)
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")
    if submission.status != "pending":
        raise HTTPException(409, "submission is not in pending status")

    submission.resubmit_requested_files = {"files": body.requested_files}
    submission.reviewer_comment = body.comment
    submission.reviewed_at = datetime.now(UTC)
    submission.reviewer_id = admin.id

    user_result = await session.execute(
        select(User).where(User.id == submission.user_id)
    )
    user = user_result.scalars().first()
    if user:
        user.kyc_status = "resubmit_requested"

    audit = AuditLog(
        admin_user_id=admin.id,
        action="kyc.request_resubmit",
        entity_type="kyc_submission",
        entity_id=submission.id,
        changes={"requested_files": body.requested_files, "comment": body.comment},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(audit)

    if user:
        await notify_kyc_resubmit_requested(
            session, user, body.requested_files, body.comment,
        )

    await session.commit()
    return {"status": "resubmit_requested"}
