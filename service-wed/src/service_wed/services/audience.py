"""Who a reminder is for. The one definition of "invited, but still owes us
an answer", shared by the automatic reminders (services/reminders.py) and
reminder campaigns created by hand (services/campaigns.py)."""

import datetime as dt

from service_wed.models.household import Household
from service_wed.ports.uow import UnitOfWorkPort


async def households_awaiting_answer(
    uow: UnitOfWorkPort,
) -> list[tuple[Household, dt.datetime]]:
    """Households that were sent an RSVP invitation (an RSVP_INVITE email
    with status SENT) and have at least one guest who hasn't answered or
    answered "Not Sure Yet". Each comes with when its most recent invitation
    went out. Call inside an open unit of work."""
    non_responding = await uow.household_repo.list_non_responding()
    invited_at = await uow.email_message_repo.get_invitation_sent_at(
        [household.id for household in non_responding]
    )
    return [
        (household, invited_at[household.id])
        for household in non_responding
        if household.id in invited_at
    ]
