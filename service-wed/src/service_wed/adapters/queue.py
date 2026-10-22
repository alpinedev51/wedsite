"""arq-backed QueuePort. The only file that calls ArqRedis.enqueue_job
directly -- everything else goes through QueuePort so it stays swappable."""

from typing import Any

from arq.connections import ArqRedis
from arq.constants import default_queue_name, health_check_key_suffix

from service_wed.ports.queue import QueuePort


class ArqQueue(QueuePort):
    def __init__(self, redis: ArqRedis) -> None:
        self._redis = redis

    async def enqueue(
        self, job_name: str, *, job_id: str | None = None, **kwargs: Any
    ) -> None:
        # arq returns None (and enqueues nothing) if job_id is already in use.
        await self._redis.enqueue_job(job_name, _job_id=job_id, **kwargs)

    async def worker_alive(self) -> bool:
        # The worker refreshes this key every
        # WorkerSettings.health_check_interval seconds and it expires soon
        # after, so it only exists while the worker's loop is running. (The
        # worker uses arq's default queue name, so this is its key too.)
        return bool(
            await self._redis.exists(default_queue_name + health_check_key_suffix)
        )
