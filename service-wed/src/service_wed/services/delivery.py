"""Delivery: the two things that happen after a campaign fans out.

1. claim_and_enqueue() -- the cron job's body (tasks/dispatch.py, arq
   "cron: dispatch_due_emails"). Claims whatever EmailMessage rows are due
   and enqueues one send_email arq job per message rather than sending them
   inline: a slow/hung provider call then only blocks its own job, and each
   message can be retried on its own (see send_one below).

2. send_one() -- the body of the send_email arq job (tasks/send.py). Loads
   the message by id (arq only serializes message_id across the queue, not
   the live ORM row), sends it, and records the outcome. On a retryable
   failure it raises RetryLater, which tasks/send.py turns into arq's
   Retry; after MAX_SEND_ATTEMPTS, or on a permanent failure, the message
   is marked FAILED. If the provider refuses for an account-level reason
   (quota used up, bad API key), the message goes back to SCHEDULED for an
   hour later instead, for up to ACCOUNT_BLOCKED_GIVE_UP_AFTER. (arq only
   re-runs a job that raises its own Retry exception -- any other exception
   just ends the job -- so retrying has to be asked for explicitly.)

3. record_webhook_event() -- the provider (Resend) calling back, sometime
   after send_one() succeeded, to say what actually happened to a message we
   already sent: delivered, opened, clicked, bounced, complained, dropped.
   A successful send only means "the provider accepted it for delivery" --
   it says nothing about whether it reached an inbox. Bounces/complaints in
   particular flip the message to FAILED so a bad contact_email shows up as
   a failure, not a silent non-response.

This service takes clean, provider-agnostic arguments (EmailEventType,
provider_event_id, occurred_at) rather than Resend's raw webhook JSON --
translating Resend's actual payload shape and verifying its signature is the
job of the webhook controller, same way adapters/email/resend.py is the only
file that knows the `resend` package's real shape.
"""

from __future__ import annotations

import datetime as dt
import logging
import uuid
from typing import Any

from service_wed.domain.value_objects import EmailEventType, EmailStatus
from service_wed.ports.email_sender import EmailSenderPort, EmailSendError
from service_wed.ports.queue import QueuePort
from service_wed.ports.uow import UnitOfWorkPort

logger = logging.getLogger("service_wed.delivery")

# A message gets this many send attempts in total before it's marked FAILED.
MAX_SEND_ATTEMPTS = 5
# Wait between attempts: 30s, 60s, 120s, 240s -- about 7.5 minutes in all,
# enough to ride out a rate limit or a short provider outage. Never more
# than _MAX_RETRY_DELAY, which must stay well under the stuck-message
# timeout in EmailMessageRepository.claim_due (30 minutes).
_BASE_RETRY_DELAY = 30.0
_MAX_RETRY_DELAY = 600.0
# When the provider refuses for an account-level reason (sending quota used
# up, bad API key, unverified domain), the message goes back to SCHEDULED
# and is tried again this much later, without using up any of its
# MAX_SEND_ATTEMPTS: it goes out once the quota resets or the account is
# fixed.
ACCOUNT_BLOCKED_RETRY_DELAY = dt.timedelta(hours=1)
# ...but not forever: a message still blocked this long after it was FIRST
# blocked is marked FAILED, so it shows up on the dashboard. A daily quota
# resets well within this; anything longer needs attention.
ACCOUNT_BLOCKED_GIVE_UP_AFTER = dt.timedelta(days=3)


class RetryLater(Exception):
    """send_one() wants another attempt in `delay_seconds`. Kept free of arq
    so this service doesn't depend on the queue library; tasks/send.py
    translates it into arq's Retry."""

    def __init__(self, delay_seconds: float) -> None:
        super().__init__(f"retry in {delay_seconds:.0f}s")
        self.delay_seconds = delay_seconds


def retry_delay(attempt: int, retry_after: float | None = None) -> float:
    """Seconds to wait after failed attempt number `attempt` (1-based):
    exponential backoff, or the provider's Retry-After if that's longer,
    capped at _MAX_RETRY_DELAY."""
    backoff = _BASE_RETRY_DELAY * 2 ** (attempt - 1)
    return min(max(backoff, retry_after or 0.0), _MAX_RETRY_DELAY)


# Events that mean the message did NOT (or will not) reach the recipient, as
# opposed to delivered/opened/clicked, which are just engagement signal on a
# message that already succeeded and shouldn't change its status.
_FAILURE_EVENTS = frozenset(
    {
        EmailEventType.BOUNCED,
        EmailEventType.COMPLAINED,
        EmailEventType.DROPPED,
        EmailEventType.FAILED,
    }
)


class DeliveryService:
    def __init__(
        self, uow: UnitOfWorkPort, email_sender: EmailSenderPort, queue: QueuePort
    ) -> None:
        self.uow = uow
        self.email_sender = email_sender
        self.queue = queue

    async def claim_and_enqueue(self, limit: int = 100) -> int:
        """Claim up to `limit` due messages and enqueue a send_email job for
        each. Returns how many were claimed, so the cron task can notice/log
        if a run claims nothing for too long."""
        async with self.uow:
            # claim_due does SELECT ... FOR UPDATE SKIP LOCKED + flips status
            # to SENDING in one statement, so two dispatch ticks running at
            # once can never claim the same row.
            messages = await self.uow.email_message_repo.claim_due(limit=limit)
            # Commit to release the row locks before we touch Redis below --
            # enqueueing shouldn't happen inside an open DB transaction.
            await self.uow.commit()

        for message in messages:
            # One job id per message: if a job for this message is still
            # queued or running (e.g. waiting out a retry delay), arq won't
            # add a second. Once that job finishes the id is free again
            # (worker.py sets keep_result = 0).
            await self.queue.enqueue(
                "send_email",
                job_id=f"send_email:{message.id}",
                message_id=message.id,
            )
        return len(messages)

    async def send_one(self, message_id: uuid.UUID) -> None:
        """Send one claimed message and record the outcome.

        Raises RetryLater for a retryable failure while attempts remain; the
        message stays SENDING in the meantime. Marks it FAILED (and returns)
        on a permanent failure or once MAX_SEND_ATTEMPTS is used up.

        Three steps, each with its own short transaction: load the message,
        send it with no transaction open (waiting for a send slot and for
        the provider can take seconds, and an open transaction would hold a
        pooled connection the whole time), then record the result."""
        async with self.uow:
            message = await self.uow.email_message_repo.get_by_id(message_id)
            if message is None:
                return  # row deleted/gone; nothing to send

            if message.status != EmailStatus.SENDING:
                # Only claimed messages are sent. SENT/FAILED/CANCELED means
                # a duplicate or stale job: sending again would be wrong.
                return

            if message.attempts > MAX_SEND_ATTEMPTS:
                # claim_due counts each reclaim of a stuck message as an
                # attempt. A message reclaimed on its last attempt still
                # gets one more real try below (an interrupted attempt may
                # have reached the provider, and the same idempotency key
                # then just returns the original id), but if that is
                # interrupted too, stop instead of reclaiming it forever.
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=(
                        f"gave up after {message.attempts} attempts that were "
                        "interrupted before finishing"
                    ),
                )
                await self.uow.commit()
                logger.error("Email %s: gave up after interrupted attempts", message.id)
                return

            attempt = message.attempts + 1
            blocked_since = message.send_blocked_since
            send_args: dict[str, Any] = {
                "to": message.recipient,
                "subject": message.subject,
                "template_key": message.template_key,
                "context": message.context or {},
                # Same key on every attempt: if an earlier attempt did reach
                # the provider (and only our bookkeeping failed), the
                # provider recognises the retry and doesn't send twice.
                "idempotency_key": message.idempotency_key,
            }

        try:
            provider_message_id = await self.email_sender.send(**send_args)
        except Exception as exc:
            await self._record_failure(message_id, attempt, blocked_since, exc)
            return

        async with self.uow:
            await self.uow.email_message_repo.update_status(
                message_id,
                EmailStatus.SENT,
                provider_message_id=provider_message_id,
                increment_attempts=True,
            )
            await self.uow.commit()

    async def _record_failure(
        self,
        message_id: uuid.UUID,
        attempt: int,
        blocked_since: dt.datetime | None,
        exc: Exception,
    ) -> None:
        """Record a failed send attempt. Raises RetryLater when the job
        should run again; otherwise the message ends up SCHEDULED (quota) or
        FAILED."""
        error = f"attempt {attempt}: {exc}"
        now = dt.datetime.now(dt.timezone.utc)

        if isinstance(exc, EmailSendError) and exc.account_blocked:
            if (
                blocked_since is None
                or now - blocked_since < ACCOUNT_BLOCKED_GIVE_UP_AFTER
            ):
                retry_at = now + ACCOUNT_BLOCKED_RETRY_DELAY
                async with self.uow:
                    await self.uow.email_message_repo.reschedule(
                        message_id, retry_at, last_error=error
                    )
                    await self.uow.commit()
                logger.warning(
                    "Email %s: provider refused for an account-level reason, "
                    "trying again at %s: %s",
                    message_id,
                    retry_at.isoformat(timespec="minutes"),
                    exc,
                )
                return
            error += (
                f" (still refused {ACCOUNT_BLOCKED_GIVE_UP_AFTER.days} days after"
                " the first refusal)"
            )
            # falls through to FAILED below

        elif (
            isinstance(exc, EmailSendError)
            and exc.retryable
            and attempt < MAX_SEND_ATTEMPTS
        ):
            delay = retry_delay(attempt, exc.retry_after)
            async with self.uow:
                await self.uow.email_message_repo.update_status(
                    message_id,
                    EmailStatus.SENDING,
                    last_error=error,
                    increment_attempts=True,
                )
                await self.uow.commit()
            logger.warning(
                "Email %s attempt %d/%d failed, retrying in %.0fs: %s",
                message_id,
                attempt,
                MAX_SEND_ATTEMPTS,
                delay,
                exc,
            )
            raise RetryLater(delay) from exc

        # Permanent failure, out of attempts, blocked too long, or not a
        # send error at all (e.g. a template that won't render) -- retrying
        # won't help.
        async with self.uow:
            await self.uow.email_message_repo.update_status(
                message_id,
                EmailStatus.FAILED,
                last_error=error,
                increment_attempts=True,
            )
            await self.uow.commit()
        logger.error("Email %s failed permanently: %s", message_id, error)

    async def record_webhook_event(
        self,
        *,
        provider_message_id: str,
        event_type: EmailEventType,
        provider_event_id: str,
        occurred_at: dt.datetime,
        payload: dict[str, Any] | None = None,
    ) -> bool:
        """Persist a provider webhook callback and, if it's a failure event,
        flip the message to FAILED. Returns False if no message has that
        provider id (yet -- see the webhook controller)."""
        async with self.uow:
            message = await self.uow.email_message_repo.get_by_provider_message_id(
                provider_message_id
            )
            if message is None:
                # Provider sent a webhook for a message we have no record of
                # (e.g. a test send from the Resend dashboard, or a message
                # from before this deployment), or a webhook that beat
                # send_one's own record of the id. Nothing to attach it to.
                return False

            event = await self.uow.email_event_repo.create(
                email_message_id=message.id,
                event_type=event_type,
                provider_event_id=provider_event_id,
                occurred_at=occurred_at,
                payload=payload,
            )
            if event is None:
                # create() does ON CONFLICT DO NOTHING on provider_event_id
                # and returns None on a hit -- we've already recorded this
                # exact event (the provider redelivered the webhook).
                return True

            if event_type in _FAILURE_EVENTS:
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=f"webhook: {event_type.value}",
                )
            await self.uow.commit()
            return True
