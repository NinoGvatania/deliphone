"""Partner proxy KYC endpoints for kiosk-based client onboarding (SPEC.md §6, §14.2)."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_partner
from app.models.partners import PartnerUser, RegistrationSession
from app.models.users import KycSubmission, User
from app.schemas.kyc import (
    CardBindingInitResponse,
    KycInitResponse,
    KycSubmitRequest,
    KycSubmitResponse,
    PartnerClientStatusResponse,
)
from app.services.notifications import notify_kyc_submitted
from app.services.storage import get_storage

router = APIRouter(prefix="/clients", tags=["partner-clients"])

KYC_BUCKET = "kyc-documents"
FILE_KEYS = ("passport_main", "passport_reg", "selfie", "video")
CONTENT_TYPES = {
    "passport_main": "image/jpeg",
    "passport_reg": "image/jpeg",
    "selfie": "image/jpeg",
    "video": "video/mp4",
}


def _s3_key(user_id: uuid.UUID, submission_id: uuid.UUID, file_name: str) -> str:
    ext = "mp4" if file_name == "video" else "jpg"
    return f"{user_id}/{submission_id}/{file_name}.{ext}"


async def _verify_user_associated(
    user_id: uuid.UUID,
    partner_user: PartnerUser,
    session: AsyncSession,
) -> User:
    """Verify user exists and is linked to this partner via a registration session."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "user not found")

    reg_result = await session.execute(
        select(RegistrationSession).where(
            RegistrationSession.attached_user_id == user_id,
            RegistrationSession.partner_id == partner_user.partner_id,
        )
    )
    if not reg_result.scalars().first():
        raise HTTPException(403, "user is not associated with this partner")

    return user


@router.post("/{user_id}/kyc/init", response_model=KycInitResponse)
async def partner_kyc_init(
    user_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> KycInitResponse:
    user = await _verify_user_associated(user_id, partner_user, session)

    result = await session.execute(
        select(KycSubmission).where(
            KycSubmission.user_id == user.id,
            KycSubmission.status.in_(["pending", "approved", "draft"]),
        )
    )
    if result.scalars().first():
        raise HTTPException(409, "active KYC submission already exists")

    submission = KycSubmission(
        user_id=user.id,
        status="draft",
        submitted_via="partner_kiosk",
        submitted_by_partner_user_id=partner_user.id,
    )
    session.add(submission)
    await session.flush()

    storage = get_storage()
    upload_urls: dict[str, str] = {}
    for key in FILE_KEYS:
        s3_key = _s3_key(user.id, submission.id, key)
        upload_urls[key] = storage.generate_upload_url(
            KYC_BUCKET, s3_key, content_type=CONTENT_TYPES[key],
        )
    await session.commit()

    return KycInitResponse(submission_id=submission.id, upload_urls=upload_urls)


@router.post("/{user_id}/kyc/upload-file")
async def partner_kyc_upload_file(
    user_id: uuid.UUID,
    file: UploadFile,
    submission_id: uuid.UUID = Query(...),
    file_type: str = Query(..., pattern=r"^(passport_main|passport_reg|selfie|video)$"),
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> dict:
    await _verify_user_associated(user_id, partner_user, session)

    result = await session.execute(
        select(KycSubmission).where(
            KycSubmission.id == submission_id,
            KycSubmission.user_id == user_id,
        )
    )
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(404, "submission not found")
    if submission.status != "draft":
        raise HTTPException(409, "submission is not in draft status")

    s3_key = _s3_key(user_id, submission_id, file_type)
    data = await file.read()

    storage = get_storage()
    storage.upload_file(
        KYC_BUCKET, s3_key, data, content_type=CONTENT_TYPES[file_type],
    )

    return {"uploaded": True, "key": s3_key}


@router.post("/{user_id}/kyc/submit", response_model=KycSubmitResponse)
async def partner_kyc_submit(
    user_id: uuid.UUID,
    body: KycSubmitRequest,
    request: Request,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> KycSubmitResponse:
    user = await _verify_user_associated(user_id, partner_user, session)

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
    submission.submitted_via = "partner_kiosk"
    user.kyc_status = "pending"

    await session.flush()
    await notify_kyc_submitted(session, user)
    await session.commit()

    # TODO: process_kyc_submission.delay(str(submission.id)) — celery task not yet created

    return KycSubmitResponse(status="pending")


@router.get("/{user_id}/status", response_model=PartnerClientStatusResponse)
async def partner_client_status(
    user_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> PartnerClientStatusResponse:
    user = await _verify_user_associated(user_id, partner_user, session)

    return PartnerClientStatusResponse(
        kyc_status=user.kyc_status,
        card_bound=False,
    )


@router.post("/{user_id}/card-binding-init", response_model=CardBindingInitResponse)
async def card_binding_init(
    user_id: uuid.UUID,
    partner_user: PartnerUser = Depends(get_current_partner),
    session: AsyncSession = Depends(get_session),
) -> CardBindingInitResponse:
    await _verify_user_associated(user_id, partner_user, session)

    short_token = str(uuid.uuid4())[:8]
    qr_url = f"https://app.deliphone.ru/bind-card?token={short_token}"

    return CardBindingInitResponse(
        qr_url=qr_url,
        short_token=short_token,
    )
