# QueuePort: enqueue a named background job. Lets services/tasks depend on
# this abstraction instead of importing arq directly -- only adapters/queue.py
# should know arq's actual API.
from typing import Any, Protocol


class QueuePort(Protocol):
    """Port for scheduling background jobs onto the async worker."""

    async def enqueue(self, job_name: str, **kwargs: Any) -> None:
        """Schedule `job_name` (an arq task function name, see worker.py) to
        run asynchronously with the given kwargs. Fire-and-forget from the
        caller's perspective -- the job's own success/failure is handled by
        the worker (see tasks/send.py's retry/backoff)."""
        ...
