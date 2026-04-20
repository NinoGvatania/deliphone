"""Seed data for local development / testing.

Run via:  make seed
          docker compose exec backend python -m app.cli.seed

Seeds:
- 1 tariff: Стандарт посуточно (349 ₽ / 24 h)
- 1 admin user with known TOTP secret (admin@deliphone.dev)
- 1 partner (commission 30%) + 1 operator + 1 location in Moscow
"""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from app.core.config import settings
from app.core.db import _get_session_factory
from app.core.security import hash_password
from app.models import (
    AdminUser,
    Partner,
    PartnerLocation,
    PartnerUser,
    Tariff,
)

# ---------- constants ----------

SEED_ADMIN_EMAIL = "admin@deliphone.dev"
SEED_ADMIN_PASSWORD = "admin123"
# Deterministic TOTP secret so dev / CI can generate valid codes:
#   pyotp.TOTP(SEED_ADMIN_TOTP_SECRET).now()
SEED_ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP"

SEED_PARTNER_OPERATOR_EMAIL = "operator@example.com"
SEED_PARTNER_OPERATOR_PASSWORD = "operator123"


async def seed() -> None:
    async with _get_session_factory()() as session:
        # --- Tariff ---
        existing = await session.execute(
            select(Tariff).where(Tariff.name == "Стандарт посуточно")
        )
        if not existing.scalars().first():
            session.add(
                Tariff(
                    name="Стандарт посуточно",
                    device_model="Xiaomi Redmi A5",
                    period_hours=24,
                    price=349.00,
                    is_active=True,
                )
            )
            print("  ✓ tariff: Стандарт посуточно 349 ₽/сутки")

        # --- Admin user ---
        existing_admin = await session.execute(
            select(AdminUser).where(AdminUser.email == SEED_ADMIN_EMAIL)
        )
        if not existing_admin.scalars().first():
            session.add(
                AdminUser(
                    email=SEED_ADMIN_EMAIL,
                    password_hash=hash_password(SEED_ADMIN_PASSWORD),
                    full_name="Тест Админ",
                    role="admin",
                    totp_secret=SEED_ADMIN_TOTP_SECRET,
                )
            )
            print(f"  ✓ admin_user: {SEED_ADMIN_EMAIL} (TOTP secret: {SEED_ADMIN_TOTP_SECRET})")

        # --- Partner + operator + location ---
        existing_partner = await session.execute(
            select(Partner).where(Partner.legal_name == "ООО Тест-Партнёр")
        )
        partner = existing_partner.scalars().first()
        if not partner:
            partner_id = uuid.uuid4()
            location_id = uuid.uuid4()

            partner = Partner(
                id=partner_id,
                legal_name="ООО Тест-Партнёр",
                inn="7707083893",
                type="company",
                contact_email="partner@example.com",
                contact_phone="+79991234567",
                status="active",
                commission_percent=30.00,
            )
            session.add(partner)

            session.add(
                PartnerUser(
                    partner_id=partner_id,
                    email=SEED_PARTNER_OPERATOR_EMAIL,
                    password_hash=hash_password(SEED_PARTNER_OPERATOR_PASSWORD),
                    full_name="Иван Операторов",
                    role="operator",
                )
            )

            session.add(
                PartnerLocation(
                    id=location_id,
                    partner_id=partner_id,
                    name="Делифон · Савёловская",
                    address="ул. Нижняя Масловка, 6",
                    city="Москва",
                    coordinates="SRID=4326;POINT(37.5885 55.7943)",
                    status="active",
                    capacity=10,
                    working_hours={
                        "mon": "09:00-21:00",
                        "tue": "09:00-21:00",
                        "wed": "09:00-21:00",
                        "thu": "09:00-21:00",
                        "fri": "09:00-21:00",
                        "sat": "10:00-20:00",
                        "sun": "10:00-18:00",
                    },
                )
            )
            print(f"  ✓ partner: ООО Тест-Партнёр (30% commission) + operator ({SEED_PARTNER_OPERATOR_EMAIL}) + location Савёловская")

        await session.commit()
        print("\nSeed complete.")


def main() -> None:
    print("Seeding database…")
    asyncio.run(seed())


if __name__ == "__main__":
    main()
