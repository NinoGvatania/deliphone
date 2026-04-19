"""Auth request/response schemas (Pydantic v2)."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr


# ---------- shared ----------


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------- client ----------


class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str
    reg_session_id: UUID | None = None


class UserBrief(BaseModel):
    id: UUID
    telegram_id: int
    telegram_username: str | None = None
    kyc_status: str
    status: str

    model_config = {"from_attributes": True}


class ClientAuthResponse(TokenResponse):
    user: UserBrief


# ---------- partner ----------


class PartnerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PartnerUserBrief(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    partner_id: UUID

    model_config = {"from_attributes": True}


class PartnerAuthResponse(TokenResponse):
    user: PartnerUserBrief


# ---------- admin ----------


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    require_2fa: bool = True
    temp_token: str


class AdminVerify2FARequest(BaseModel):
    temp_token: str
    totp_code: str


class AdminUserBrief(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class AdminAuthResponse(TokenResponse):
    user: AdminUserBrief
