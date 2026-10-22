"""job: send_email(message_id). Sends a single already-claimed EmailMessage.

DeliveryService.send_one() decides whether a failure is worth another try
and how long to wait; this job turns that into arq's Retry, which is the only
exception arq re-runs a job for (any other exception just ends the job).
"""

import uuid
from typing import Any

from arq import Retry

from service_wed.bootstrap import AppContainer
from service_wed.services.delivery import RetryLater


async def send_email(ctx: dict[str, Any], message_id: uuid.UUID) -> None:
    container: AppContainer = ctx["container"]
    # Fresh service/uow per job -- see tasks/dispatch.py's comment; this is
    # the job most likely to run many-at-once (one per queued message).
    try:
        await container.new_delivery_service().send_one(message_id)
    except RetryLater as later:
        raise Retry(defer=later.delay_seconds) from later
