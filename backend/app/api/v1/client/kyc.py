"""Client KYC endpoints (SPEC.md §5.3, §14.1)."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_client
from app.models.users import KycSubmission, User
from app.schemas.kyc import (
    KycInitResponse,
    KycStatusResponse,
    KycSubmitRequest,
    KycSubmitResponse,
)
from app.services.notifications import notify_kyc_submitted
from app.services.storage import get_storage

router = APIRouter(prefix="/me/kyc", tags=["client-kyc"])

KYC_BUCKET = "kyc-documents"
FILE_KEYS = ("passport_main", "passport_reg", "selfie", "video")
CONTENT_TYPES = {
    "passport_main": "image/jpeg",
    "passport_reg": "image/jpeg",
    "selfie": "image/jpeg",
    "video": "video/mp4",
}


def _s3_key(user_id: uuid.UUID, submission_id: uuid.UUID, file_name: str) -> str:
    return f"{user_id}/{submission_id}/{file_name}.jpg" if file_name != "video" else f"{user_id}/{submission_id}/{file_name}.mp4"


def _generate_upload_urls(
    user_id: uuid.UUID, submission_id: uuid.UUID,
) -> dict[str, str]:
    storage = get_storage()
    urls: dict[str, str] = {}
    for key in FILE_KEYS:
        s3_key = _s3_key(user_id, submission_id, key)
        urls[key] = storage.generate_upload_url(
            KYC_BUCKET, s3_key, content_type=CONTENT_TYPES[key],
        )
    return urls


@router.post("/init", response_model=KycInitResponse)
async def kyc_init(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> KycInitResponse:
    result = await session.execute(
        select(KycSubmission).where(
            KycSubmission.user_id == user.id,
            KycSubmission.status.in_(["pending", "approved", "draft"]),
        )
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(409, "active KYC submission already exists")

    submission = KycSubmission(
        user_id=user.id,
        status="draft",
        submitted_via="client_app",
    )
    session.add(submission)
    await session.flush()

    upload_urls = _generate_upload_urls(user.id, submission.id)
    await session.commit()

    return KycInitResponse(submission_id=submission.id, upload_urls=upload_urls)


@router.post("/submit", response_model=KycSubmitResponse)
async def kyc_submit(
    body: KycSubmitRequest,
    request: Request,
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> KycSubmitResponse:
    result = await session.execute(
        select(KycSubmission).where(
            KycSubmission.id == body.submission_id,
            KycSubmission.user_id == user.id,
        )
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")
    if submission.status != "draft":
        raise HTTPException(409, "submission is not in draft status")

    storage = get_storage()
    missing = []
    for key in FILE_KEYS:
        s3_key = _s3_key(user.id, submission.id, key)
        if not storage.head_object(KYC_BUCKET, s3_key):
            missing.append(key)
    if missing:
        raise HTTPException(422, f"files not uploaded: {', '.join(missing)}")

    passport_raw = body.passport_series + body.passport_number
    user.passport_hash = hashlib.sha256(passport_raw.encode()).hexdigest()

    user.full_name = body.full_name
    user.birth_date = body.birth_date
    user.passport_series = body.passport_series
    user.passport_number = body.passport_number
    user.passport_issued_by = body.passport_issued_by
    user.passport_issue_date = str(body.passport_issue_date)
    user.registration_address = body.registration_address

    now = datetime.now(UTC)
    client_ip = request.client.host if request.client else "unknown"
    submission.consents = {
        "consent_pdn": {"accepted": True, "at": now.isoformat(), "ip": client_ip},
        "consent_offer": {"accepted": True, "at": now.isoformat(), "ip": client_ip},
    }

    submission.passport_main_url = _s3_key(user.id, submission.id, "passport_main")
    submission.passport_reg_url = _s3_key(user.id, submission.id, "passport_reg")
    submission.selfie_url = _s3_key(user.id, submission.id, "selfie")
    submission.video_url = _s3_key(user.id, submission.id, "video")

    submission.status = "pending"
    submission.submitted_at = now
    user.kyc_status = "pending"

    await session.flush()
    await notify_kyc_submitted(session, user)
    await session.commit()

    # TODO: process_kyc_submission.delay(str(submission.id)) — celery task not yet created

    return KycSubmitResponse(status="pending")


@router.post("/resubmit", response_model=KycInitResponse)
async def kyc_resubmit(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> KycInitResponse:
    if user.kyc_status not in ("rejected", "resubmit_requested"):
        raise HTTPException(409, "resubmit not allowed in current status")

    result = await session.execute(
        select(KycSubmission)
        .where(KycSubmission.user_id == user.id)
        .order_by(KycSubmission.created_at.desc())
    )
    old_submission = result.scalars().first()

    submission = KycSubmission(
        user_id=user.id,
        status="draft",
        submitted_via="client_app",
        previous_submission_id=old_submission.id if old_submission else None,
    )
    session.add(submission)
    await session.flush()

    upload_urls = _generate_upload_urls(user.id, submission.id)
    await session.commit()

    return KycInitResponse(submission_id=submission.id, upload_urls=upload_urls)


@router.get("", response_model=KycStatusResponse)
async def kyc_status(
    user: User = Depends(get_current_client),
    session: AsyncSession = Depends(get_session),
) -> KycStatusResponse:
    result = await session.execute(
        select(KycSubmission)
        .where(KycSubmission.user_id == user.id)
        .order_by(KycSubmission.created_at.desc())
    )
    submission = result.scalars().first()

    if not submission:
        return KycStatusResponse(submission_id=None, status=user.kyc_status)

    return KycStatusResponse(
        submission_id=submission.id,
        status=submission.status,
        auto_flags=submission.auto_flags,
        reviewer_comment=submission.reviewer_comment,
        rejection_reason=submission.rejection_reason,
        resubmit_requested_files=submission.resubmit_requested_files,
    )
