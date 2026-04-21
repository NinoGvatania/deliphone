"""YooKassa integration -- sandbox and production.

All methods use Idempotence-Key header for safe retries.
Supports two-stage payments (hold -> capture) with hold_duration up to 180 days.
"""

import hashlib
import hmac
import uuid
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("yookassa")


class YookassaClient:
    BASE_URL = "https://api.yookassa.ru/v3"

    def __init__(self) -> None:
        self.shop_id = settings.YOOKASSA_SHOP_ID
        self.secret_key = settings.YOOKASSA_SECRET_KEY
        self.webhook_secret = settings.YOOKASSA_WEBHOOK_SECRET

    def _auth(self) -> tuple[str, str]:
        return (self.shop_id, self.secret_key)

    def _idempotency_key(self) -> str:
        return str(uuid.uuid4())

    async def create_payment(
        self,
        amount: Decimal,
        currency: str,
        description: str,
        payment_method_id: str | None = None,
        return_url: str | None = None,
        receipt: dict | None = None,
        metadata: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """One-stage payment (auto-capture)."""
        body: dict = {
            "amount": {"value": str(amount), "currency": currency},
            "description": description,
            "capture": True,
        }
        if payment_method_id:
            body["payment_method_id"] = payment_method_id
        if return_url:
            body["confirmation"] = {"type": "redirect", "return_url": return_url}
        if receipt:
            body["receipt"] = receipt
        if metadata:
            body["metadata"] = metadata
        return await self._post("/payments", body, idempotency_key)

    async def create_hold(
        self,
        amount: Decimal,
        currency: str,
        description: str,
        payment_method_id: str | None = None,
        return_url: str | None = None,
        receipt: dict | None = None,
        metadata: dict | None = None,
        hold_duration_days: int = 7,
        idempotency_key: str | None = None,
    ) -> dict:
        """Two-stage: authorize (hold) without capture."""
        body: dict = {
            "amount": {"value": str(amount), "currency": currency},
            "description": description,
            "capture": False,
        }
        if payment_method_id:
            body["payment_method_id"] = payment_method_id
        if return_url:
            body["confirmation"] = {"type": "redirect", "return_url": return_url}
        if receipt:
            body["receipt"] = receipt
        if metadata:
            body["metadata"] = metadata
        return await self._post("/payments", body, idempotency_key)

    async def capture_hold(
        self,
        payment_id: str,
        amount: Decimal | None = None,
        receipt: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """Capture a held payment (full or partial)."""
        body: dict = {}
        if amount is not None:
            body["amount"] = {"value": str(amount), "currency": "RUB"}
        if receipt:
            body["receipt"] = receipt
        return await self._post(f"/payments/{payment_id}/capture", body, idempotency_key)

    async def cancel_hold(self, payment_id: str, idempotency_key: str | None = None) -> dict:
        return await self._post(f"/payments/{payment_id}/cancel", {}, idempotency_key)

    async def create_refund(
        self,
        payment_id: str,
        amount: Decimal,
        receipt: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        body: dict = {
            "payment_id": payment_id,
            "amount": {"value": str(amount), "currency": "RUB"},
        }
        if receipt:
            body["receipt"] = receipt
        return await self._post("/refunds", body, idempotency_key)

    async def get_payment(self, payment_id: str) -> dict:
        async with httpx.AsyncClient(auth=self._auth()) as client:
            resp = await client.get(f"{self.BASE_URL}/payments/{payment_id}", timeout=15.0)
            resp.raise_for_status()
            return resp.json()

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        if not self.webhook_secret:
            return False
        expected = hmac.new(
            self.webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def _post(self, path: str, body: dict, idempotency_key: str | None = None) -> dict:
        headers = {"Idempotence-Key": idempotency_key or self._idempotency_key()}
        async with httpx.AsyncClient(auth=self._auth()) as client:
            resp = await client.post(
                f"{self.BASE_URL}{path}",
                json=body,
                headers=headers,
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()


_client: YookassaClient | None = None


def get_yookassa() -> YookassaClient:
    global _client
    if _client is None:
        _client = YookassaClient()
    return _client
