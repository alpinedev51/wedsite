# CSV import; edit households; generate token + short code
import csv
import io
import secrets
import uuid
from dataclasses import dataclass

from service_wed.domain.errors import NotFoundError, ValidationError
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import Page
from service_wed.schemas.household import GuestImportResponse, HouseholdAdminView


@dataclass
class _CleanedGuestRow:
    household_name: str
    contact_email: str | None
    guest_name: str
    is_plus_one: bool


class GuestListService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def list_households(
        self, limit: int = 50, offset: int = 0
    ) -> Page[HouseholdAdminView]:
        """Admin household list, alphabetical, with each guest's RSVP status
        -- backs the frontend's "guests" management table."""
        async with self.uow:
            households, total = await self.uow.household_repo.list_paginated(
                limit=limit, offset=offset
            )
            return Page(
                items=[HouseholdAdminView.model_validate(h) for h in households],
                total=total,
                limit=limit,
                offset=offset,
            )

    async def get_household(self, household_id: uuid.UUID) -> HouseholdAdminView:
        """Single household detail (guests + RSVP status), for a household
        detail/edit page."""
        async with self.uow:
            household = await self.uow.household_repo.get_by_id(household_id)
            if household is None:
                raise NotFoundError(f"Household {household_id} does not exist.")
            return HouseholdAdminView.model_validate(household)

    async def import_csv(self, file_bytes: bytes) -> GuestImportResponse:
        """
        Expects a CSV with headers:
        HouseholdName, ContactEmail, GuestName, IsPlusOne

        Row rules:
        - GuestName is always required -- there's no fallback for a missing
          guest name, unlike HouseholdName below.
        - HouseholdName may be blank: a guest with no household given is
          their own one-person household, named after themselves.
        - ContactEmail may be blank: households are matched/merged by name
          (get_by_display_name), not only by email, so a guest whose row has
          no email still lands in the same household as an earlier row for
          that name that did have one -- and inherits that email, same as
          every guest in a household always mirrors the household's contact
          email (see guest_repo.create's `email=household.contact_email`
          below; Guest.email has never been guest-specific, only ever a copy
          of the household's).
        - A row with BOTH ContactEmail and HouseholdName blank can't be
          merged with anything and has no way to be reached -- still
          imported (as its own named-after-itself household with no email),
          but flagged back to the caller as a warning rather than silently
          accepted, since it's very likely a data-entry gap rather than
          intentional.
        """
        text_data = file_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text_data))

        required_columns = {"HouseholdName", "ContactEmail", "GuestName", "IsPlusOne"}
        cleaned_rows: list[_CleanedGuestRow] = []
        warnings: list[str] = []
        for line_number, row in enumerate(reader, start=2):
            missing = required_columns - row.keys()
            if missing:
                raise ValidationError(
                    f"CSV row {line_number}: missing column(s) {', '.join(sorted(missing))}."
                )

            guest_name = (row["GuestName"] or "").strip()
            if not guest_name:
                raise ValidationError(f"CSV row {line_number}: GuestName is required.")

            household_name_raw = (row["HouseholdName"] or "").strip()
            contact_email = (row["ContactEmail"] or "").strip() or None

            if not contact_email and not household_name_raw:
                warnings.append(
                    f"Row {line_number} ({guest_name}): no ContactEmail and no "
                    "HouseholdName -- imported as their own household with no "
                    "contact email, so they won't receive any campaign emails "
                    "until one is added."
                )

            # A blank HouseholdName means this guest IS their own household.
            household_name = household_name_raw or guest_name
            is_plus_one = (row["IsPlusOne"] or "").strip().lower() == "true"

            cleaned_rows.append(
                _CleanedGuestRow(
                    household_name=household_name,
                    contact_email=contact_email,
                    guest_name=guest_name,
                    is_plus_one=is_plus_one,
                )
            )

        async with self.uow:
            for cleaned in cleaned_rows:
                # Matched by name, not email -- a household with no email
                # yet (created by an earlier row) still needs to be found
                # again here rather than always creating a new one. Queried
                # fresh every row (not cached) so a guest_repo.create() a few
                # lines below is visible to the very next row for the same
                # household within this same import.
                household = await self.uow.household_repo.get_by_display_name(
                    cleaned.household_name
                )
                is_new_household = household is None

                if household is None:
                    household = await self.uow.household_repo.create(
                        display_name=cleaned.household_name,
                        contact_email=cleaned.contact_email,
                        invite_token=secrets.token_urlsafe(16),
                    )
                elif cleaned.contact_email and not household.contact_email:
                    # Backfill: an earlier row for this household had no
                    # email, but this one does -- adopt it as the
                    # household's. SQLAlchemy picks this up as an ordinary
                    # dirty-attribute update on commit, no explicit repo
                    # call needed (same pattern as services/rsvp.py).
                    household.contact_email = cleaned.contact_email

                # BUGFIX: a household just returned by create() has never
                # been loaded from a query -- under the async ORM, touching
                # its .guests collection triggers an implicit lazy-load
                # (even collection-loaded-state tracking, e.g. assigning
                # `household.guests = []`, reads the old value first), which
                # raises MissingGreenlet since that load can't happen outside
                # an awaited call. A brand new household can't have any
                # guests yet by construction, so there's nothing to check --
                # only households that came back from get_by_display_name()
                # (eager-loaded with guests + rsvp_response) are safe to
                # inspect here.
                already_added = not is_new_household and any(
                    guest.full_name.strip().lower() == cleaned.guest_name.lower()
                    for guest in household.guests
                )
                if not already_added:
                    await self.uow.guest_repo.create(
                        household_id=household.id,
                        full_name=cleaned.guest_name,
                        email=household.contact_email,
                        is_plus_one=cleaned.is_plus_one,
                    )

            await self.uow.commit()

        message = "Guest list imported successfully."
        if warnings:
            message += f" {len(warnings)} row(s) need attention -- see warnings."
        return GuestImportResponse(success=True, message=message, warnings=warnings)
