from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.core.db import get_session
from app.models.catalog import Device

router = APIRouter(tags=["public"])

@router.get("/d/{short_code}")
async def device_redirect(short_code: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Device).where(Device.short_code == short_code))
    device = result.scalars().first()
    if not device:
        return {"found": False, "message": "Устройство не найдено"}
    return {
        "found": True,
        "short_code": short_code,
        "model": device.model,
        "status": device.status,
        "message": "Это устройство в аренде от Делифон. Нашёл? Верни в любую точку — получишь 500 ₽.",
        "client_url": f"/found/{short_code}",
        "partner_url": f"/devices/{device.id}",
    }
