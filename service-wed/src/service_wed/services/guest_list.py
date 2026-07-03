# CSV import; edit households; generate token + short code
import csv
import io
import secrets
from dataclasses import dataclass

from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse


# BUGFIX: cleaned rows were plain dict[str, str | bool | None], so every
# value read back out (regardless of key) had the full union type, which is
# why the type checker rejected passing e.g. cleaned["guest_name"] as a str.
# A dataclass gives each field its own concrete type.
@dataclass
class _CleanedGuestRow:
    household_name: str
    contact_email: str | None
    guest_name: str
    is_plus_one: bool


class GuestListService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def import_csv(self, file_bytes: bytes) -> SuccessResponse:
        """
        Expects a CSV with headers:
        HouseholdName, ContactEmail, GuestName, IsPlusOne
        """
        # BUGFIX (multiple issues in the original loop):
        #   1. Rows with a blank ContactEmail all matched the same
        #      get_by_email(""), silently merging unrelated households.
        #   2. A missing/malformed column raised a raw KeyError/AttributeError
        #      mid-loop with no indication of which CSV row was bad.
        #   3. Re-running the same CSV created duplicate Guest rows.
        # Rows are validated and normalized in a first pass (no DB writes) so
        # a bad row is rejected with a row number before anything is written,
        # and duplicate guests within a household are skipped on re-import.
        #
        # text_data = file_bytes.decode("utf-8")
        # reader = csv.DictReader(io.StringIO(text_data))
        #
        # async with self.uow:
        #     for row in reader:
        #         household = await self.uow.household_repo.get_by_email(
        #             row["ContactEmail"]
        #         )
        #
        #         if not household:
        #             household = await self.uow.household_repo.create(
        #                 display_name=row["HouseholdName"],
        #                 contact_email=row["ContactEmail"],
        #                 invite_token=secrets.token_urlsafe(16),
        #             )
        #
        #         await self.uow.guest_repo.create(
        #             household_id=household.id,
        #             full_name=row["GuestName"],
        #             is_plus_one=row["IsPlusOne"].lower() == "true",
        #         )
        #
        #     await self.uow.commit()
        #     return SuccessResponse(
        #         success=True, message="Guest list imported successfully."
        #     )
        text_data = file_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text_data))

        required_columns = {"HouseholdName", "ContactEmail", "GuestName", "IsPlusOne"}
        cleaned_rows: list[_CleanedGuestRow] = []
        for line_number, row in enumerate(reader, start=2):  # header is line 1
            missing = required_columns - row.keys()
            if missing:
                raise ValueError(
                    f"CSV row {line_number}: missing column(s) {', '.join(sorted(missing))}."
                )

            household_name = (row["HouseholdName"] or "").strip()
            guest_name = (row["GuestName"] or "").strip()
            if not household_name or not guest_name:
                raise ValueError(
                    f"CSV row {line_number}: HouseholdName and GuestName are required."
                )

            contact_email = (row["ContactEmail"] or "").strip() or None
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
                household = None
                if cleaned.contact_email is not None:
                    household = await self.uow.household_repo.get_by_email(
                        cleaned.contact_email
                    )

                if not household:
                    household = await self.uow.household_repo.create(
                        display_name=cleaned.household_name,
                        contact_email=cleaned.contact_email,
                        invite_token=secrets.token_urlsafe(16),
                    )

                already_added = any(
                    guest.full_name.strip().lower() == cleaned.guest_name.lower()
                    for guest in household.guests
                )
                if not already_added:
                    await self.uow.guest_repo.create(
                        household_id=household.id,
                        full_name=cleaned.guest_name,
                        is_plus_one=cleaned.is_plus_one,
                    )

            await self.uow.commit()
            return SuccessResponse(
                success=True, message="Guest list imported successfully."
            )
