"""KYC request/response schemas for client, partner, and admin flows."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Client KYC ──────────────────────────────────────────────────────────────


class KycInitResponse(BaseModel):
    submission_id: UUID
    upload_urls: dict[str, str]


class KycSubmitRequest(BaseModel):
    submission_id: UUID
    full_name: str = Field(min_length=2, max_length=255)
    birth_date: date
    passport_series: str = Field(pattern=r"^\d{4}$")
    passport_number: str = Field(pattern=r"^\d{6}$")
    passport_issued_by: str = Field(min_length=2, max_length=512)
    passport_issue_date: date
    registration_address: str = Field(min_length=5, max_length=512)
    consent_pdn: bool
    consent_offer: bool

    @field_validator("consent_pdn", "consent_offer")
    @classmethod
    def must_be_true(cls, v: bool, info) -> bool:
        if not v:
            raise ValueError(f"{info.field_name} must be accepted")
        return v

    @field_validator("birth_date")
    @classmethod
    def must_be_18(cls, v: date) -> date:
        from datetime import date as d

        age = (d.today() - v).days // 365
        if age < 18:
            raise ValueError("applicant must be at least 18 years old")
        return v


class KycSubmitResponse(BaseModel):
    status: str
    estimated_minutes: int = 30


class KycResubmitRequest(BaseModel):
    previous_submission_id: UUID


class KycStatusResponse(BaseModel):
    submission_id: UUID | None
    status: str
    auto_flags: dict | None = None
    reviewer_comment: str | None = None
    rejection_reason: str | None = None
    resubmit_requested_files: list[str] | None = None


# ── Partner registration sessions ──────────────────────────────────────────


class RegistrationSessionCreateResponse(BaseModel):
    session_id: UUID
    qr_url: str
    deep_link: str


class RegistrationSessionStatusResponse(BaseModel):
    status: str
    user: PartnerRegisteredUserBrief | None = None


class PartnerRegisteredUserBrief(BaseModel):
    id: UUID
    telegram_id: int
    telegram_first_name: str | None
    telegram_last_name: str | None
    telegram_photo_url: str | None
    kyc_status: str

    model_config = {"from_attributes": True}


# forward ref fix
RegistrationSessionStatusResponse.model_rebuild()


class PartnerClientStatusResponse(BaseModel):
    kyc_status: str
    card_bound: bool


class CardBindingInitResponse(BaseModel):
    qr_url: str
    short_token: str


# ── Admin KYC moderation ──────────────────────────────────────────────────


class KycQueueItem(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    submitted_via: str | None
    auto_flags: dict | None
    submitted_at: str | None
    telegram_first_name: str | None = None
    telegram_last_name: str | None = None

    model_config = {"from_attributes": True}


class KycQueueResponse(BaseModel):
    items: list[KycQueueItem]
    total: int
    page: int
    size: int


class KycDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    submitted_via: str | None
    auto_flags: dict | None
    consents: dict | None
    reviewer_comment: str | None
    rejection_reason: str | None
    resubmit_requested_files: dict | None
    submitted_at: str | None
    reviewed_at: str | None
    photo_urls: dict[str, str]  # signed read URLs

    model_config = {"from_attributes": True}


class KycRejectRequest(BaseModel):
    reason_code: str = Field(
        pattern=r"^(duplicate_account|fake_documents|age_under_18|other)$"
    )
    reason_text: str = Field(min_length=2, max_length=1000)


class KycRequestResubmitRequest(BaseModel):
    requested_files: list[str] = Field(min_length=1)
    comment: str = Field(min_length=2, max_length=1000)
