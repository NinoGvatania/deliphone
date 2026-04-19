"""Seed data for local development / testing.

Run via:  make seed
          docker compose exec backend python -m app.cli.seed

Seeds:
- 1 tariff: Стандарт посуточно (349 ₽ / 24 h)
- 16 damage_pricing rows for Xiaomi Redmi A5 (SPEC §10.11)
- 1 admin user with known TOTP secret (admin@deliphone.local)
- 1 partner + 1 operator + 1 location in Moscow
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    AdminUser,
    DamagePricing,
    Partner,
    PartnerLocation,
    PartnerUser,
    Tariff,
)

# ---------- constants ----------

SEED_ADMIN_EMAIL = "admin@deliphone.local"
SEED_ADMIN_PASSWORD = "admin123"
# Deterministic TOTP secret so dev / CI can generate valid codes:
#   pyotp.TOTP(SEED_ADMIN_TOTP_SECRET).now()
SEED_ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP"

SEED_PARTNER_OPERATOR_EMAIL = "operator@example.com"
SEED_PARTNER_OPERATOR_PASSWORD = "operator123"

DAMAGE_PRICING_ROWS: list[tuple[str, str | None, float]] = [
    ("Экран", "Царапина", 700),
    ("Экран", "Трещина", 2200),
    ("Экран", "Разбит", 3200),
    ("Корпус", "Скол", 500),
    ("Корпус", "Трещина", 1200),
    ("Задняя крышка (3D)", "Повреждена / отсутствует", 800),
    ("Камера", "Царапина стекла", 400),
    ("Камера", "Трещина стекла", 900),
    ("Разъём зарядки", "Не работает", 1000),
    ("Кнопки", "Не работают", 900),
    ("Аккумулятор", "Критическая деградация", 1000),
    ("Попадание воды", None, 3000),
    ("Утрата / невозврат", "Полная", 4500),
    ("FRP-lock не снят", None, 1500),
    ("Отсутствует кейс", None, 400),
    ("QR-наклейка повреждена", None, 200),
]


async def seed() -> None:
    async with SessionLocal() as session:
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

        # --- Damage pricing ---
        existing_dp = await session.execute(
            select(DamagePricing).where(DamagePricing.device_model == "Xiaomi Redmi A5")
        )
        if not existing_dp.scalars().first():
            for cat, sub, price in DAMAGE_PRICING_ROWS:
                session.add(
                    DamagePricing(
                        device_model="Xiaomi Redmi A5",
                        category=cat,
                        subcategory=sub,
                        price=price,
                    )
                )
            print(f"  ✓ damage_pricing: {len(DAMAGE_PRICING_ROWS)} rows for Redmi A5")

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
            print(f"  ✓ partner: ООО Тест-Партнёр + operator ({SEED_PARTNER_OPERATOR_EMAIL}) + location Савёловская")

        await session.commit()
        print("\nSeed complete.")


def main() -> None:
    print("Seeding database…")
    asyncio.run(seed())


if __name__ == "__main__":
    main()
