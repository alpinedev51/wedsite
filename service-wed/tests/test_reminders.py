"""The rules for automatic RSVP reminders (services/reminders.py)."""

import datetime as dt

from service_wed.domain.rsvp_window import RsvpWindow, rsvp_window
from service_wed.ports.repositories.email_message import ReminderStats
from service_wed.services.reminders import ReminderService

NOW = dt.datetime(2027, 5, 15, 15, 0, tzinfo=dt.timezone.utc)
WEEK = dt.timedelta(days=7)


def is_due(invited_at=None, stats=None, cap=2, interval=WEEK, now=NOW) -> bool:
    return ReminderService._is_due(
        invited_at=invited_at, stats=stats, cap=cap, interval=interval, now=now
    )


# --- the original bug ------------------------------------------------------


def test_never_invited_household_gets_no_reminder():
    # Before the fix this returned True: no reminder history meant "send".
    assert is_due(invited_at=None, stats=None) is False


def test_cap_zero_turns_reminders_off_even_without_history():
    # Before the fix the cap was only checked for households that already
    # had a reminder, so cap=0 still sent everyone one.
    assert is_due(invited_at=NOW - dt.timedelta(days=30), cap=0) is False


# --- normal cadence --------------------------------------------------------


def test_no_reminder_until_interval_after_invitation():
    assert is_due(invited_at=NOW - dt.timedelta(days=6)) is False
    assert is_due(invited_at=NOW - dt.timedelta(days=7)) is True


def test_daily_cron_timing_jitter_does_not_push_a_reminder_to_day_8():
    # Last week's run scheduled its reminder a few ms later in the second
    # than this week's run started.
    invited = NOW - dt.timedelta(days=20)
    last_week = ReminderStats(
        reminder_count=1,
        last_scheduled_for=NOW - WEEK + dt.timedelta(milliseconds=40),
    )
    assert is_due(invited_at=invited, stats=last_week) is True


def test_reminder_a_week_after_an_afternoon_invitation_is_due_on_day_7():
    # NOW is 09:00 at the venue; invited at 16:00 a week ago.
    invited = NOW - WEEK + dt.timedelta(hours=7)
    assert is_due(invited_at=invited) is True


def test_dst_change_does_not_delay_the_weekly_reminder():
    # 09:00 venue time on Mon 2027-03-15 (after the Mar 14 DST change) is
    # only 6 days 23 hours after 09:00 on Mon 2027-03-08.
    now = dt.datetime(2027, 3, 15, 15, 0, tzinfo=dt.timezone.utc)  # 09:00 MDT
    last = dt.datetime(2027, 3, 8, 16, 0, tzinfo=dt.timezone.utc)  # 09:00 MST
    stats = ReminderStats(reminder_count=1, last_scheduled_for=last)
    assert is_due(invited_at=now - dt.timedelta(days=30), stats=stats, now=now) is True


def test_next_reminder_waits_an_interval_after_the_last_one():
    invited = NOW - dt.timedelta(days=20)
    recent = ReminderStats(
        reminder_count=1, last_scheduled_for=NOW - dt.timedelta(days=3)
    )
    old = ReminderStats(reminder_count=1, last_scheduled_for=NOW - dt.timedelta(days=8))
    assert is_due(invited_at=invited, stats=recent) is False
    assert is_due(invited_at=invited, stats=old) is True


def test_cap_reached():
    invited = NOW - dt.timedelta(days=60)
    stats = ReminderStats(
        reminder_count=2, last_scheduled_for=NOW - dt.timedelta(days=30)
    )
    assert is_due(invited_at=invited, stats=stats, cap=2) is False


def test_reinvited_after_a_reminder_counts_from_the_new_invitation():
    invited = NOW - dt.timedelta(days=2)  # invitation re-sent recently
    stats = ReminderStats(
        reminder_count=1, last_scheduled_for=NOW - dt.timedelta(days=30)
    )
    assert is_due(invited_at=invited, stats=stats) is False


# --- RSVP window -----------------------------------------------------------


def test_rsvp_window():
    deadline = NOW + dt.timedelta(days=30)
    assert (
        rsvp_window(opens_at=NOW + dt.timedelta(days=1), deadline=deadline, now=NOW)
        == RsvpWindow.NOT_OPEN_YET
    )
    assert (
        rsvp_window(opens_at=NOW - dt.timedelta(days=1), deadline=deadline, now=NOW)
        == RsvpWindow.OPEN
    )
    assert rsvp_window(opens_at=None, deadline=NOW, now=NOW) == RsvpWindow.OPEN
    assert (
        rsvp_window(opens_at=None, deadline=NOW - dt.timedelta(seconds=1), now=NOW)
        == RsvpWindow.CLOSED
    )
