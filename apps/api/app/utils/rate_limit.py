from __future__ import annotations

from fastapi import HTTPException, status

from app.db.redis import redis_client


async def enforce_rate_limit(bucket: str, limit: int, window_seconds: int) -> None:
    key = f"rate:{bucket}"
    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, window_seconds)
    if current > limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

