"""SMS provider abstraction for OTP delivery."""

from __future__ import annotations

import random
from abc import ABC, abstractmethod

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("sms")


class SMSProvider(ABC):
    @abstractmethod
    async def send(self, phone: str, text: str) -> bool: ...


class DevSMSProvider(SMSProvider):
    """Logs SMS to stdout instead of sending — for local/dev environments."""

    async def send(self, phone: str, text: str) -> bool:
        logger.info("dev_sms", phone=phone, text=text)
        return True


def get_sms_provider() -> SMSProvider:
    return DevSMSProvider()


def generate_code() -> str:
    """Generate a 4-digit OTP code."""
    return str(random.randint(1000, 9999))
