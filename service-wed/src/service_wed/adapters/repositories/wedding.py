import datetime as dt

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.wedding import WEDDING_ID, Wedding
from service_wed.ports.repositories.wedding import WeddingRepository


class SQLAlchemyWeddingRepository(WeddingRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self) -> Wedding | None:
        result = await self.session.execute(
            select(Wedding).where(Wedding.id == WEDDING_ID)
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        wedding_date: dt.datetime,
        rsvp_deadline: dt.datetime,
        rsvp_opens_at: dt.datetime | None,
        reminder_cap: int,
        reminder_interval_days: int,
        venue_name: str | None,
        venue_address: str | None,
        venue_city: str | None,
        bride_first_name: str | None,
        groom_first_name: str | None,
    ) -> Wedding:
        # There's exactly one row (id is always WEDDING_ID), so ON CONFLICT
        # DO UPDATE on the primary key gives a single "set the wedding
        # config" statement that works whether this is the first time it's
        # ever been set or the hundredth -- no separate create/update path
        # for the caller to pick between.
        values = {
            "id": WEDDING_ID,
            "wedding_date": wedding_date,
            "rsvp_deadline": rsvp_deadline,
            "rsvp_opens_at": rsvp_opens_at,
            "reminder_cap": reminder_cap,
            "reminder_interval_days": reminder_interval_days,
            "venue_name": venue_name,
            "venue_address": venue_address,
            "venue_city": venue_city,
            "bride_first_name": bride_first_name,
            "groom_first_name": groom_first_name,
        }
        stmt = (
            insert(Wedding)
            .values(**values)
            .on_conflict_do_update(
                index_elements=["id"],
                set_={k: v for k, v in values.items() if k != "id"},
            )
            .returning(Wedding)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
