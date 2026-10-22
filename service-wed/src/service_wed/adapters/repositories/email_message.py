import datetime as dt
import uuid
from typing import Any

from sqlalchemy import and_, case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import EmailStatus, EmailType
from service_wed.models.email_message import EmailMessage
from service_wed.ports.repositories.email_message import (
    EmailMessageRepository,
    ReminderStats,
)


# A message still SENDING this long after its last update has lost its job
# (e.g. Redis restarted while the job was queued). claim_due picks it up
# again. Comfortably longer than the longest gap between attempts
# (services/delivery.py caps retry delays at 10 minutes).
STUCK_SENDING_AFTER = dt.timedelta(minutes=30)


class SQLAlchemyEmailMessageRepository(EmailMessageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_batch(self, messages: list[EmailMessage]) -> None:
        self.session.add_all(messages)
        await self.session.flush()

    async def claim_due(self, limit: int = 100) -> list[EmailMessage]:
        """WITH claimed AS (
               SELECT id FROM email_messages
               WHERE (status = 'scheduled' AND scheduled_for <= now())
                  OR (status = 'sending' AND updated_at < now() - '30 minutes')
               ORDER BY scheduled_for LIMIT :limit
               FOR UPDATE SKIP LOCKED
           )
           UPDATE email_messages SET status = 'sending',
               attempts = attempts + (1 if it was already 'sending')
           WHERE id IN (SELECT id FROM claimed)
           RETURNING *;

        One statement -> no gap between selecting due rows and locking them
        for a concurrent claim to race into.

        Reclaiming a stuck message counts as one attempt (its job died
        without recording a result), so a message that keeps getting
        interrupted runs out of attempts in send_one instead of being
        reclaimed forever.
        """
        claimed_ids = (
            select(EmailMessage.id)
            .where(
                or_(
                    and_(
                        EmailMessage.status == EmailStatus.SCHEDULED,
                        EmailMessage.scheduled_for <= func.now(),
                    ),
                    and_(
                        EmailMessage.status == EmailStatus.SENDING,
                        EmailMessage.updated_at < func.now() - STUCK_SENDING_AFTER,
                    ),
                )
            )
            .order_by(EmailMessage.scheduled_for)
            .limit(limit)
            .with_for_update(skip_locked=True)
            .cte("claimed")
        )
        stmt = (
            update(EmailMessage)
            .where(EmailMessage.id.in_(select(claimed_ids.c.id)))
            .values(
                status=EmailStatus.SENDING,
                # SET sees the row's old values: +1 only for a stuck SENDING
                # row being reclaimed, not for a SCHEDULED one being claimed.
                attempts=EmailMessage.attempts
                + case((EmailMessage.status == EmailStatus.SENDING, 1), else_=0),
            )
            .returning(EmailMessage)
        )
        result = await self.session.execute(
            stmt, execution_options={"populate_existing": True}
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        message_id: uuid.UUID,
        status: EmailStatus,
        provider_message_id: str | None = None,
        last_error: str | None = None,
        increment_attempts: bool = False,
    ) -> None:
        update_values: dict[str, Any] = {
            "status": status,
            # Any outcome recorded here (sent, a non-account error, failed)
            # ends an account-level block, so a later, separate block gets
            # its own full grace period (see reschedule).
            "send_blocked_since": None,
        }
        if provider_message_id is not None:
            update_values["provider_message_id"] = provider_message_id
        if last_error is not None:
            update_values["last_error"] = last_error
        if status == EmailStatus.SENT:
            # clock_timestamp(): the moment of this update. now() would be
            # when the transaction began.
            update_values["sent_at"] = func.clock_timestamp()

        stmt = (
            update(EmailMessage)
            .where(EmailMessage.id == message_id)
            .values(**update_values)
        )

        if increment_attempts:
            stmt = stmt.values(attempts=EmailMessage.attempts + 1)

        await self.session.execute(stmt)

    async def reschedule(
        self, message_id: uuid.UUID, scheduled_for: dt.datetime, last_error: str
    ) -> None:
        await self.session.execute(
            update(EmailMessage)
            .where(EmailMessage.id == message_id)
            .values(
                status=EmailStatus.SCHEDULED,
                scheduled_for=scheduled_for,
                last_error=last_error,
                send_blocked_since=func.coalesce(
                    EmailMessage.send_blocked_since, func.clock_timestamp()
                ),
            )
        )

    async def get_by_provider_message_id(
        self, provider_message_id: str
    ) -> EmailMessage | None:
        stmt = select(EmailMessage).where(
            EmailMessage.provider_message_id == provider_message_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, message_id: uuid.UUID) -> EmailMessage | None:
        result = await self.session.execute(
            select(EmailMessage).where(EmailMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_reminder_stats(
        self, household_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, ReminderStats]:
        if not household_ids:
            return {}

        stmt = (
            select(
                EmailMessage.household_id,
                func.count(EmailMessage.id),
                func.max(EmailMessage.scheduled_for),
            )
            .where(
                EmailMessage.household_id.in_(household_ids),
                EmailMessage.email_type == EmailType.REMINDER,
                EmailMessage.status != EmailStatus.CANCELED,
                # A reminder that failed before Resend accepted it (no
                # provider id: quota, a rejected request) never reached the
                # guest, so it doesn't use up the household's allowance. One
                # Resend accepted and that then bounced or was suppressed
                # does count, so a bad address isn't retried every day.
                ~and_(
                    EmailMessage.status == EmailStatus.FAILED,
                    EmailMessage.provider_message_id.is_(None),
                ),
            )
            .group_by(EmailMessage.household_id)
        )
        result = await self.session.execute(stmt)
        return {
            household_id: ReminderStats(
                reminder_count=reminder_count, last_scheduled_for=last_scheduled_for
            )
            for household_id, reminder_count, last_scheduled_for in result.all()
        }

    async def get_invitation_sent_at(
        self, household_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, dt.datetime]:
        if not household_ids:
            return {}

        # SENT only: a scheduled/sending invitation hasn't reached anyone
        # yet, and one that bounced was flipped to FAILED by the webhook.
        stmt = (
            select(EmailMessage.household_id, func.max(EmailMessage.sent_at))
            .where(
                EmailMessage.household_id.in_(household_ids),
                EmailMessage.email_type == EmailType.RSVP_INVITE,
                EmailMessage.status == EmailStatus.SENT,
                EmailMessage.sent_at.is_not(None),
            )
            .group_by(EmailMessage.household_id)
        )
        result = await self.session.execute(stmt)
        return {household_id: sent_at for household_id, sent_at in result.all()}

    async def count_by_status(
        self, campaign_id: uuid.UUID | None = None
    ) -> dict[EmailStatus, int]:
        stmt = select(EmailMessage.status, func.count()).group_by(EmailMessage.status)
        # Optional filter: the global dashboard calls this with no campaign_id
        # (every message ever sent); a campaign's own detail view passes its
        # id to scope the same grouped count to just its fanned-out messages.
        if campaign_id is not None:
            stmt = stmt.where(EmailMessage.campaign_id == campaign_id)
        result = await self.session.execute(stmt)
        return {status: count for status, count in result.all()}
