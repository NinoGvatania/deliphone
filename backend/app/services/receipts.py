"""Receipt email/phone resolution for 54-FZ compliance."""

from __future__ import annotations

from decimal import Decimal

from app.models.users import User


def get_receipt_customer(user: User) -> dict:
    """Return the customer field for YooKassa receipt.

    Uses email if available, otherwise phone number (without + prefix).
    """
    if user.email:
        return {"email": user.email}
    return {"phone": user.phone_number.lstrip("+").lstrip("7")}


def build_receipt(user: User, description: str, amount: Decimal) -> dict:
    """Build a YooKassa receipt dict for 54-FZ."""
    customer = get_receipt_customer(user)
    return {
        "customer": customer,
        "items": [
            {
                "description": description,
                "quantity": "1.00",
                "amount": {"value": str(amount), "currency": "RUB"},
                "vat_code": 1,
            }
        ],
    }
