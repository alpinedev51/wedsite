"""Wedding config DTOs -- the couple's single wedding row (models/wedding.py's
WEDDING_ID singleton)."""

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WeddingPublicView(BaseModel):
    """Public, unauthenticated read model: what the wedding website's public
    pages need (countdown, venue, RSVP deadline). Deliberately excludes
    reminder_cap/reminder_interval_days -- those are internal delivery-tuning
    knobs, not something a guest needs to see."""

    wedding_date: dt.datetime
    venue_name: str | None
    venue_address: str | None
    venue_city: str | None
    bride_first_name: str | None
    groom_first_name: str | None
    rsvp_opens_at: dt.datetime | None
    rsvp_deadline: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class WeddingAdminView(WeddingPublicView):
    """Admin read model: same as public, plus the reminder-cadence knobs
    ReminderService.reconcile() actually uses."""

    reminder_cap: int
    reminder_interval_days: int


class WeddingUpsertRequest(BaseModel):
    """Single payload for setting the wedding config. There's only ever one
    wedding (see models/wedding.py's WEDDING_ID), so this is a full PUT --
    a settings-form GUI loads WeddingAdminView, lets the couple edit it, and
    submits the whole thing back -- rather than separate create/update
    endpoints or partial PATCH semantics."""

    wedding_date: dt.datetime
    rsvp_deadline: dt.datetime
    rsvp_opens_at: dt.datetime | None = None
    reminder_cap: int = Field(default=2, ge=0)
    reminder_interval_days: int = Field(default=7, ge=1)
    venue_name: str | None = None
    venue_address: str | None = None
    venue_city: str | None = None
    bride_first_name: str | None = None
    groom_first_name: str | None = None

    @model_validator(mode="after")
    def _check_dates(self) -> "WeddingUpsertRequest":
        if self.rsvp_deadline > self.wedding_date:
            raise ValueError("rsvp_deadline must not be after wedding_date.")
        if self.rsvp_opens_at is not None and self.rsvp_opens_at >= self.rsvp_deadline:
            raise ValueError("rsvp_opens_at must be before rsvp_deadline.")
        return self
