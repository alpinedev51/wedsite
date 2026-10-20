import uuid

from sqlalchemy import func
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

        upsert = stmt.on_conflict_do_update(
            index_elements=["guest_id"],
            set_=dict(
                status=stmt.excluded.status,
                meal_choice=stmt.excluded.meal_choice,
                dietary_notes=stmt.excluded.dietary_notes,
                # BUGFIX: Timestamps.updated_at's onupdate=func.now() is a
                # client-side column default; it is not guaranteed to be
                # merged into an INSERT ... ON CONFLICT DO UPDATE's SET
                # clause the way it would for a plain UPDATE, so it must be
                # listed explicitly or edits wouldn't bump updated_at.
                # (This used to also set a `responded_at` column here, kept
                # in sync the same way -- it was redundant with created_at/
                # updated_at, which already capture "first submitted" and
                # "last changed"; see models/rsvp_response.py.)
                updated_at=func.now(),
            ),
        ).returning(RsvpResponse)

        result = await self.session.execute(upsert)
        return result.scalar_one()
