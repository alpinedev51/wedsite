# CSV import; edit households; generate token + short code
import csv
import io
import secrets

from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse


class GuestListService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def import_csv(self, file_bytes: bytes) -> SuccessResponse:
        """
        Expects a CSV with headers:
        HouseholdName, ContactEmail, GuestName, IsPlusOne
        """
        text_data = file_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text_data))

        async with self.uow:
            for row in reader:
                household = await self.uow.household_repo.get_by_email(
                    row["ContactEmail"]
                )

                if not household:
                    household = await self.uow.household_repo.create(
                        display_name=row["HouseholdName"],
                        contact_email=row["ContactEmail"],
                        invite_token=secrets.token_urlsafe(16),
                    )

                await self.uow.guest_repo.create(
                    household_id=household.id,
                    full_name=row["GuestName"],
                    is_plus_one=row["IsPlusOne"].lower() == "true",
                )

            await self.uow.commit()
            return SuccessResponse(
                success=True, message="Guest list imported successfully."
            )
