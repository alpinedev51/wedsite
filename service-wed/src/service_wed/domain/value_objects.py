# enums + VOs: RsvpStatus, MealChoice, CampaignType, EmailStatus, EmailAddress, InviteToken/Code
from __future__ import annotations

from enum import StrEnum


class RsvpStatus(StrEnum):
    ATTENDING = "attending"
    DECLINED = "declined"
    WAITING = "waiting"


class CampaignType(StrEnum):
    SAVE_THE_DATE = "save_the_date"
    RSVP_INVITE = "rsvp_invite"
    REMINDER = "reminder"
    FINAL_DETAILS = "final_details"
    THANK_YOU = "thank_you"


class CampaignStatus(StrEnum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELED = "canceled"


class EmailType(StrEnum):
    SAVE_THE_DATE = "save_the_date"
    RSVP_INVITE = "rsvp_invite"
    REMINDER = "reminder"
    FINAL_DETAILS = "final_details"
    THANK_YOU = "thank_you"
    RSVP_CONFIRMATION = "rsvp_confirmation"
    MAGIC_LINK_RECOVERY = "magic_link_recovery"


class EmailStatus(StrEnum):
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    CANCELED = "canceled"


class EmailEventType(StrEnum):
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    COMPLAINED = "complained"
    DROPPED = "dropped"
    FAILED = "failed"
