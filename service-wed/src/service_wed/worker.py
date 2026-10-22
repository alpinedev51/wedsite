"""arq worker entrypoint. Run locally with: arq service_wed.worker.WorkerSettings

WorkerSettings is a plain class, not instantiated -- arq's CLI reads it via
class-attribute introspection (arq.worker.get_kwargs), so the attribute names
below (functions, cron_jobs, redis_settings, on_startup, on_shutdown) are
arq's contract, not something this codebase invented.
"""

from typing import Any

from arq.cron import cron
from arq.worker import func

from service_wed.adapters.redis import redis_settings_from_url
from service_wed.bootstrap import build_container
from service_wed.config.venue import VENUE_TZ
from service_wed.services.delivery import MAX_SEND_ATTEMPTS
from service_wed.tasks.dispatch import dispatch_due_emails
from service_wed.tasks.reminders import evaluate_reminders
from service_wed.tasks.send import send_email


async def startup(ctx: dict[str, Any]) -> None:
    """Build the same AppContainer the API uses (see bootstrap.py) once per
    worker process, and stash it on ctx so every job/cron function below can
    reach it."""
    ctx["container"] = await build_container()


async def shutdown(ctx: dict[str, Any]) -> None:
    await ctx["container"].close()


class WorkerSettings:
    # Registered so they're invokable by name via enqueue_job, in addition
    # to however cron_jobs below triggers them.
    functions = [
        # send_one() itself stops at MAX_SEND_ATTEMPTS and marks the message
        # FAILED. arq's own cap sits a little above that, because a job
        # interrupted by a worker restart also counts as a try in arq.
        func(send_email, max_tries=MAX_SEND_ATTEMPTS + 3),
        dispatch_due_emails,
        evaluate_reminders,
    ]

    cron_jobs = [
        # No hour/minute given -> arq's croniter default is "every minute,
        # at second 0" -- exactly what dispatch_due_emails needs: pick up
        # anything newly due as soon as reasonably possible.
        cron(dispatch_due_emails),
        # Once a day at 09:00 Durango time (see timezone below): decide
        # who's due a reminder.
        cron(evaluate_reminders, hour=9, minute=0),
    ]

    # Cron hours above are Durango wall-clock time. arq defaults to the
    # system timezone, which is UTC in the container -- hour=9 would fire
    # at 3am at the venue and reminder emails would go out then.
    timezone = VENUE_TZ

    # How often the worker refreshes its health key in Redis (arq's default
    # is hourly). Read by `arq --check` (the compose health check) and by
    # GET /api/v1/health/worker (for the uptime monitor).
    health_check_interval = 60

    # Keep no job results. arq refuses to enqueue a job whose id still has a
    # stored result (kept 1h by default), which would silently block
    # re-sending a reclaimed message under its "send_email:<id>" job id (see
    # DeliveryService.claim_and_enqueue). Set worker-wide, not per function:
    # a job that fails outright (e.g. max_tries used up) stores its result
    # under the worker-wide setting. Nothing reads these results.
    keep_result = 0

    redis_settings = redis_settings_from_url()
    on_startup = startup
    on_shutdown = shutdown
