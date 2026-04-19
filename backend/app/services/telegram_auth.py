"""Telegram Login Widget HMAC-SHA256 verification (SPEC §5.3)."""

from __future__ import annotations

import hashlib
import hmac


def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    """Verify Telegram Login Widget data.

    data must contain 'hash' plus profile fields.
    Algorithm:
      secret_key = SHA256(bot_token)
      data_check_string = "\\n".join(f"{k}={v}" for k,v in sorted fields excluding hash)
      expected = HMAC-SHA256(secret_key, data_check_string)
      compare_digest(received_hash, expected)
    """
    received_hash = data.get("hash")
    if not received_hash:
        return False

    check_fields = {k: v for k, v in data.items() if k != "hash"}
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(check_fields.items())
    )

    secret_key = hashlib.sha256(bot_token.encode()).digest()
    expected = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(received_hash, expected)
