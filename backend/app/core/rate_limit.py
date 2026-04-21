"""Redis-based rate limiter as a FastAPI dependency."""
import time
from fastapi import Depends, HTTPException, Request
import redis.asyncio as aioredis
from app.core.config import settings

async def get_redis() -> aioredis.Redis:
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield r
    finally:
        await r.aclose()

async def _check_rate(redis: aioredis.Redis, key: str, limit: int, window_sec: int = 60):
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window_sec + 5)
    if count > limit:
        raise HTTPException(429, "too many requests")

# Dependencies for each auth endpoint:
async def rate_limit_sms_send(request: Request, redis=Depends(get_redis)):
    ip = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    await _check_rate(redis, f"rl:sms_send:{ip}:{bucket}", 5)

async def rate_limit_partner_login(request: Request, redis=Depends(get_redis)):
    # rate limit by IP since we don't have email yet in dependency
    ip = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    await _check_rate(redis, f"rl:partner_login:{ip}:{bucket}", 5)

async def rate_limit_admin_login(request: Request, redis=Depends(get_redis)):
    ip = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    await _check_rate(redis, f"rl:admin_login:{ip}:{bucket}", 5)

async def rate_limit_2fa(request: Request, redis=Depends(get_redis)):
    ip = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    await _check_rate(redis, f"rl:2fa:{ip}:{bucket}", 3)
