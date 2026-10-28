"""ExportService: flatten households/guests/RSVP responses into a CSV
snapshot for the admin /exports endpoint -- one row per guest, so the couple
can open it in a spreadsheet for a seating chart or caterer headcount.

xlsx isn't implemented: it'd need an extra dependency (openpyxl/xlsxwriter)
not in pyproject.toml yet, and CSV opens in every spreadsheet tool anyway --
add xlsx later only if a real use case needs formatting CSV can't do
(multiple sheets, cell styling, formulas).
"""

import csv
import io

from service_wed.ports.uow import UnitOfWorkPort

# Spreadsheet apps run a cell starting with one of these as a formula. Guests
# type free text (dietary notes, song requests, messages), so a guest could
# plant e.g. =HYPERLINK(...) in the file the couple opens. A leading ' makes
# the app show the text as-is (OWASP's "CSV injection" advice).
# Also read by the import (services/guest_list.py), which strips this
# guard back off when an export is re-uploaded.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe_cell(value: str) -> str:
    return "'" + value if value.startswith(FORMULA_PREFIXES) else value


_CSV_HEADER = [
    "HouseholdName",
    "ContactEmail",
    "GuestName",
    "IsPlusOne",
    # Per household (repeated on each of its rows); the import reads it back.
    "PlusOnesAllowed",
    "RsvpStatus",
    "MealChoice",
    "DietaryNotes",
    "SongRequest",
    "MessageToCouple",
    "HouseholdId",
    "GuestId",
]


class ExportService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def export_guests_csv(self) -> str:
        """Build the full CSV as a string. Small enough (a wedding guest
        list, not a data warehouse table) that buffering it in memory rather
        than streaming row-by-row from the DB is the simpler choice."""
        async with self.uow:
            households = await self.uow.household_repo.list_all_with_guests()

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(_CSV_HEADER)
        for household in households:
            for guest in household.guests:
                writer.writerow(
                    _safe_cell(cell)
                    for cell in [
                        household.display_name,
                        household.contact_email or "",
                        guest.full_name,
                        "true" if guest.is_plus_one else "false",
                        str(household.plus_ones_allowed),
                        guest.rsvp_status.value if guest.rsvp_status else "",
                        guest.meal_choice or "",
                        guest.dietary_notes or "",
                        household.song_request or "",
                        household.message_to_couple or "",
                        str(household.id),
                        str(guest.id),
                    ]
                )
        return buffer.getvalue()
