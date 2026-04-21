"""Registration session schemas (legacy module name kept for import compat)."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


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
    phone_number: str
    first_name: str

    model_config = {"from_attributes": True}


# forward ref fix
RegistrationSessionStatusResponse.model_rebuild()
