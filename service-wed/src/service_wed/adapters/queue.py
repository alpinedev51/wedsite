"""arq-backed QueuePort. The only file that calls ArqRedis.enqueue_job
directly -- everything else goes through QueuePort so it stays swappable."""

from typing import Any

from arq.connections import ArqRedis

from service_wed.ports.queue import QueuePort


class ArqQueue(QueuePort):
    def __init__(self, redis: ArqRedis) -> None:
        self._redis = redis

    async def enqueue(self, job_name: str, **kwargs: Any) -> None:
        await self._redis.enqueue_job(job_name, **kwargs)
