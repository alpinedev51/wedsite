"""cron: evaluate_reminders. Runs once a day (see worker.py's cron_jobs) and
delegates to ReminderService.reconcile() to create and fan out a REMINDER
campaign for whichever households are currently due one.
"""

from typing import Any

from service_wed.bootstrap import AppContainer

# TODO: there's no admin UI yet to configure reminder campaign copy, so
# subject/template_key are hardcoded here. Revisit once one exists.
_REMINDER_SUBJECT = "Just a friendly reminder to RSVP!"
_REMINDER_TEMPLATE_KEY = "reminder"


async def evaluate_reminders(ctx: dict[str, Any]) -> None:
    container: AppContainer = ctx["container"]
    # Fresh service/uow per run -- see tasks/dispatch.py's comment.
    await container.new_reminder_service().reconcile(
        subject=_REMINDER_SUBJECT, template_key=_REMINDER_TEMPLATE_KEY
    )
