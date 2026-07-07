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

_CSV_HEADER = [
    "HouseholdName",
    "ContactEmail",
    "GuestName",
    "IsPlusOne",
    "RsvpStatus",
    "MealChoice",
    "DietaryNotes",
    "SongRequest",
    "MessageToCouple",
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
                    [
                        household.display_name,
                        household.contact_email or "",
                        guest.full_name,
                        "true" if guest.is_plus_one else "false",
                        guest.rsvp_status.value if guest.rsvp_status else "",
                        guest.meal_choice or "",
                        guest.dietary_notes or "",
                        household.song_request or "",
                        household.message_to_couple or "",
                    ]
                )
        return buffer.getvalue()
