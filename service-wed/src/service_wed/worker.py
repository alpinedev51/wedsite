"""arq worker entrypoint. Run locally with: arq service_wed.worker.WorkerSettings

WorkerSettings is a plain class, not instantiated -- arq's CLI reads it via
class-attribute introspection (arq.worker.get_kwargs), so the attribute names
below (functions, cron_jobs, redis_settings, on_startup, on_shutdown) are
arq's contract, not something this codebase invented.
"""

from typing import Any

from arq.cron import cron

from service_wed.adapters.redis import redis_settings_from_url
from service_wed.bootstrap import build_container
from service_wed.config.venue import VENUE_TZ
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
    functions = [send_email, dispatch_due_emails, evaluate_reminders]

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

    redis_settings = redis_settings_from_url()
    on_startup = startup
    on_shutdown = shutdown
