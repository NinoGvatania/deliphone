"""AES-256-GCM encryption for PII fields (passport data per §15.1).

KYC_ENCRYPTION_KEY must be a 32-byte key encoded as base64.
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_NONCE_SIZE = 12  # 96-bit nonce recommended for AES-GCM


def _get_key() -> bytes:
    raw = base64.b64decode(settings.KYC_ENCRYPTION_KEY)
    if len(raw) != 32:
        msg = "KYC_ENCRYPTION_KEY must decode to exactly 32 bytes"
        raise ValueError(msg)
    return raw


def encrypt(plaintext: str) -> str:
    """Encrypt *plaintext* and return base64-encoded nonce+ciphertext."""
    key = _get_key()
    nonce = os.urandom(_NONCE_SIZE)
    ct = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    """Decrypt a base64-encoded nonce+ciphertext *token* back to plaintext."""
    key = _get_key()
    raw = base64.b64decode(token)
    nonce, ct = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    return AESGCM(key).decrypt(nonce, ct, None).decode()
