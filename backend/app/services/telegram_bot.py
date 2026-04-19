"""Telegram Bot API client for sending notifications.

Not used until Phase 5 (notifications). Created now so the interface
is established and tests can mock it.
"""
import httpx
import structlog
from app.core.config import settings

logger = structlog.get_logger("telegram_bot")

class TelegramBotClient:
    def __init__(self, token: str | None = None, dry_run: bool | None = None):
        self.token = token or settings.TG_BOT_TOKEN
        self.dry_run = dry_run if dry_run is not None else settings.TG_BOT_DRY_RUN
        self._base_url = f"https://api.telegram.org/bot{self.token}"

    async def send_message(
        self, telegram_id: int, text: str, parse_mode: str = "HTML"
    ) -> dict | None:
        if self.dry_run:
            logger.info("tg.dry_run", telegram_id=telegram_id, text=text[:100])
            return None
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base_url}/sendMessage",
                json={"chat_id": telegram_id, "text": text, "parse_mode": parse_mode},
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()

# Singleton for dependency injection
_bot: TelegramBotClient | None = None

def get_telegram_bot() -> TelegramBotClient:
    global _bot
    if _bot is None:
        _bot = TelegramBotClient()
    return _bot
