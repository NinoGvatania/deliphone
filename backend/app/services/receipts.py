"""Receipt email resolution for 54-FZ compliance."""

from app.core.config import settings
from app.models.users import User


def get_receipt_email(user: User) -> str:
    """Return the email to use in YooKassa receipt for this user.

    If the user has set an explicit email_for_receipts, use it.
    Otherwise, generate a deterministic fallback from telegram_id.
    """
    if user.email_for_receipts:
        return user.email_for_receipts
    return f"tg{user.telegram_id}@{settings.RECEIPT_EMAIL_DOMAIN}"
