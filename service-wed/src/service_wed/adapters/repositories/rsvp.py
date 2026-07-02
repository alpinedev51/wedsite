import uuid

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.rsvp_response import RsvpResponse
from service_wed.ports.repositories.rsvp import RsvpRepository
from service_wed.domain.value_objects import RsvpStatus


class SQLAlchemyRsvpRepository(RsvpRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert_response(
        self,
        guest_id: uuid.UUID,
        status: RsvpStatus,
        meal_choice: str | None,
        dietary_notes: str | None,
    ) -> RsvpResponse:
        stmt = insert(RsvpResponse).values(
            guest_id=guest_id,
            status=status,
            meal_choice=meal_choice,
            dietary_notes=dietary_notes,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=["guest_id"],
            set_=dict(
                status=stmt.excluded.status,
                meal_choice=stmt.excluded.meal_choice,
                dietary_notes=stmt.excluded.dietary_notes,
                responded_at=stmt.excluded.responded_at,
            ),
        ).returning(RsvpResponse)

        result = await self.session.execute(stmt)
        return result.scalar_one()
