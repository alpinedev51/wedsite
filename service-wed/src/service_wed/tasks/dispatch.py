"""cron: dispatch_due_emails. Runs every minute (see worker.py's cron_jobs),
claims whatever EmailMessage rows are due, and enqueues one send_email job
per message (tasks/send.py) instead of sending them inline here -- a slow
provider call then only blocks its own job, not the whole batch.
"""

from typing import Any

from service_wed.bootstrap import AppContainer


async def dispatch_due_emails(ctx: dict[str, Any]) -> int:
    """arq job body. ctx['container'] is the AppContainer built once at
    worker startup (see worker.py's `startup`)."""
    container: AppContainer = ctx["container"]
    # A fresh DeliveryService (and fresh UnitOfWork) per job run -- arq can
    # execute up to max_jobs jobs concurrently on one worker process, so
    # reusing one long-lived service/uow across runs would risk two
    # concurrent runs corrupting each other's DB session (see bootstrap.py's
    # module docstring).
    return await container.new_delivery_service().claim_and_enqueue(limit=100)
