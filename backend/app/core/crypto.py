"""SQLAlchemy TypeDecorator for transparent field-level encryption.

Usage in models:
    full_name: Mapped[str | None] = mapped_column(EncryptedString())
"""

from __future__ import annotations

from sqlalchemy import String, TypeDecorator

from app.core.config import settings
from app.core.encryption import decrypt, encrypt


class EncryptedString(TypeDecorator):
    """Stores AES-256-GCM ciphertext in the DB, returns plaintext to Python."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001, ANN201
        if value is None:
            return None
        if not settings.KYC_ENCRYPTION_KEY:
            return value
        return encrypt(value)

    def process_result_value(self, value, dialect):  # noqa: ANN001, ANN201
        if value is None:
            return None
        if not settings.KYC_ENCRYPTION_KEY:
            return value
        try:
            return decrypt(value)
        except Exception:
            return value  # graceful fallback for unencrypted legacy data
