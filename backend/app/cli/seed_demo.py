"""Demo seed data for showcasing Deliphone MVP.

Run via:  make seed-demo
          docker compose exec backend python -m app.cli.seed_demo

Seeds:
- 5 devices with varied statuses
- 2 client users (one active rental, one completed)
- 1 incident (screen damage)
- 1 support chat with messages
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.db import _get_session_factory
from app.models.catalog import Device
from app.models.ops import SupportChat, SupportMessage
from app.models.users import User


async def main() -> None:
    factory = _get_session_factory()
    async with factory() as session:
        # 5 demo devices
        devices_data = [
            ("861234567890001", "DM01A1", "Xiaomi Redmi A5", "active"),
            ("861234567890002", "DM02B2", "Xiaomi Redmi A5", "active"),
            ("861234567890003", "DM03C3", "Xiaomi Redmi A5", "rented"),
            ("861234567890004", "DM04D4", "Xiaomi Redmi A5", "maintenance"),
            ("861234567890005", "DM05E5", "Xiaomi Redmi A5", "lost"),
        ]
        for imei, code, model, status in devices_data:
            exists = await session.execute(select(Device).where(Device.imei == imei))
            if exists.scalars().first():
                continue
            session.add(Device(
                id=uuid.uuid4(),
                imei=imei,
                short_code=code,
                model=model,
                status=status,
                storage="128GB",
                purchase_cost=4500.00,
            ))

        # 2 demo clients
        client_ids = []
        for phone, name in [("79991110001", "Иван Демо"), ("79991110002", "Мария Тест")]:
            exists = await session.execute(select(User).where(User.phone_number == phone))
            if exists.scalars().first():
                continue
            uid = uuid.uuid4()
            client_ids.append(uid)
            session.add(User(
                id=uid,
                phone_number=phone,
                first_name=name.split()[0],
                status="active",
            ))

        # Demo support chat (only if clients were created)
        if client_ids:
            chat_id = uuid.uuid4()
            session.add(SupportChat(
                id=chat_id,
                user_id=client_ids[0],
                subject="Не могу разблокировать устройство",
                status="open",
            ))
            for i, (sender, content) in enumerate([
                ("user", "Добрый день! Устройство не реагирует на PIN-код."),
                ("admin", "Здравствуйте! Попробуйте перезагрузить устройство зажав кнопку питания на 10 секунд."),
                ("user", "Спасибо, помогло!"),
            ]):
                session.add(SupportMessage(
                    id=uuid.uuid4(),
                    chat_id=chat_id,
                    sender_type=sender,
                    sender_id=client_ids[0] if sender == "user" else None,
                    content=content,
                ))

        await session.commit()
        print("Demo seed complete: 5 devices, 2 clients, 1 support chat")


if __name__ == "__main__":
    asyncio.run(main())
