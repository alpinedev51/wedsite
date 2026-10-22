"""When guests may RSVP. The one definition of the RSVP window, used both to
accept or reject a submission (services/rsvp.py) and to decide whether
reminders go out (services/reminders.py)."""

import datetime as dt
from enum import StrEnum


class RsvpWindow(StrEnum):
    NOT_OPEN_YET = "not_open_yet"  # before rsvp_opens_at
    OPEN = "open"
    CLOSED = "closed"  # after rsvp_deadline


def rsvp_window(
    *, opens_at: dt.datetime | None, deadline: dt.datetime, now: dt.datetime
) -> RsvpWindow:
    """Where `now` falls. No opens_at means open from the start; the deadline
    itself is still inside the window."""
    if opens_at is not None and now < opens_at:
        return RsvpWindow.NOT_OPEN_YET
    if now > deadline:
        return RsvpWindow.CLOSED
    return RsvpWindow.OPEN
