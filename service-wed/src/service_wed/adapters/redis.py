"""Builds the arq RedisSettings/connection pool from app settings.

One shared pool is used for two different things (see bootstrap.py):
  - the arq queue (adapters/queue.py enqueues jobs through it)
  - rate-limit counters (middleware/rate_limit.py)
Both just need a Redis connection; arq's ArqRedis is a normal redis-py client
with job-queueing methods bolted on, so there's no need for two pools.
"""

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from service_wed.config.settings import settings


def redis_settings_from_url() -> RedisSettings:
    """Parse the REDIS_DSN/REDIS_URL setting into arq's RedisSettings shape."""
    return RedisSettings.from_dsn(str(settings.redis_dsn))


async def create_redis_pool() -> ArqRedis:
    """Open the shared Redis connection pool. Call once at startup (API
    lifespan or worker startup) and close it on shutdown."""
    return await create_pool(redis_settings_from_url())
