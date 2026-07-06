"""job: send_email(message_id). Sends a single already-claimed EmailMessage.
Retry/backoff is handled by arq itself (see worker.py's WorkerSettings,
default max_tries=5): if send_one() raises, arq redelivers this job rather
than this module implementing its own retry loop.
"""

import uuid
from typing import Any

from service_wed.bootstrap import AppContainer


async def send_email(ctx: dict[str, Any], message_id: uuid.UUID) -> None:
    container: AppContainer = ctx["container"]
    # Fresh service/uow per job -- see tasks/dispatch.py's comment; this is
    # the job most likely to run many-at-once (one per queued message).
    await container.new_delivery_service().send_one(message_id)
