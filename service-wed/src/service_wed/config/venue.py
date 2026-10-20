"""The venue's timezone -- the one place a calendar date gets decided.

Datetimes are stored and compared as UTC instants everywhere (DB columns are
timestamptz, "now" is always dt.datetime.now(dt.timezone.utc)). That's
correct for *comparisons* -- e.g. "is the RSVP deadline past?" -- but not
for turning an instant into a calendar date a human reads. An end-of-day
RSVP deadline (23:59 on June 28 in Durango) is 05:59 on June 29 in UTC, so
formatting it in UTC would tell guests the wrong day.

Anything that turns a stored instant into a date for display or for a
day count goes through VENUE_TZ first. Mirrors ui-wed's WEDDING_TIME_ZONE
(ui-wed/src/lib/date.ts) -- change both together if the venue ever moves.
"""

from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

VENUE_TZ = ZoneInfo("America/Denver")


def as_venue_time(value: dt.datetime) -> dt.datetime:
    """A datetime with no timezone is wall-clock time at the venue; one with a
    timezone is already an exact instant and is kept as is. Returns UTC.

    This is what lets .env say WEDDING_DATE=2027-09-04 (midnight in Durango)
    or RSVP_DEADLINE=2027-06-28T23:59:59 without anyone working out the UTC
    offset -- zoneinfo applies MDT or MST for that date automatically.
    Mirrors ui-wed's civilToInstant, which reads such values the same way."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=VENUE_TZ)
    return value.astimezone(dt.timezone.utc)


def venue_date(instant: dt.datetime) -> dt.date:
    """The calendar date at the venue for a timezone-aware instant."""
    return instant.astimezone(VENUE_TZ).date()


def format_venue_date(instant: dt.datetime) -> str:
    """e.g. "September 4, 2027", as read on a calendar at the venue."""
    return instant.astimezone(VENUE_TZ).strftime("%B %-d, %Y")
