"""Delivery: the two things that happen after a campaign fans out.

1. claim_and_enqueue() -- the cron job's body (tasks/dispatch.py, arq
   "cron: dispatch_due_emails"). Claims whatever EmailMessage rows are due
   and enqueues one send_email arq job per message rather than sending them
   inline: a slow/hung provider call then only blocks its own job, and arq's
   own retry/backoff on the send_email job (configured in worker.py) handles
   transient failures without this service reimplementing retry logic.

2. send_one() -- the body of the send_email arq job (tasks/send.py). Loads
   the message by id (arq only serializes message_id across the queue, not
   the live ORM row), sends it, and records the outcome. Re-raises on
   failure so arq's retry/backoff actually fires.

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
import uuid
from typing import Any

from service_wed.domain.value_objects import EmailEventType, EmailStatus
from service_wed.ports.email_sender import EmailSenderPort
from service_wed.ports.queue import QueuePort
from service_wed.ports.uow import UnitOfWorkPort

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
            await self.queue.enqueue("send_email", message_id=message.id)
        return len(messages)

    async def send_one(self, message_id: uuid.UUID) -> None:
        """Send one already-claimed message and persist the outcome.
        Re-raises on failure so arq's own retry/backoff (see worker.py's
        registration of this job) schedules another attempt."""
        async with self.uow:
            message = await self.uow.email_message_repo.get_by_id(message_id)
            if message is None:
                return  # row deleted/gone; nothing to send

            if message.status == EmailStatus.SENT:
                # Defensive: guards against a spurious duplicate delivery of
                # the same arq job re-sending a message that already went
                # out successfully.
                return

            try:
                provider_message_id = await self.email_sender.send(
                    to=message.recipient,
                    subject=message.subject,
                    template_key=message.template_key,
                    context=message.context or {},
                )
            except Exception as exc:
                # EmailSenderPort.send() raises rather than returning a
                # sentinel on failure -- record it, then commit before
                # re-raising so the FAILED/attempts update survives even
                # though this transaction technically "failed."
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=str(exc),
                    increment_attempts=True,
                )
                await self.uow.commit()
                raise

            await self.uow.email_message_repo.update_status(
                message.id,
                EmailStatus.SENT,
                provider_message_id=provider_message_id,
                increment_attempts=True,
            )
            await self.uow.commit()

    async def record_webhook_event(
        self,
        *,
        provider_message_id: str,
        event_type: EmailEventType,
        provider_event_id: str,
        occurred_at: dt.datetime,
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Persist a provider webhook callback and, if it's a failure event,
        flip the message to FAILED."""
        async with self.uow:
            message = await self.uow.email_message_repo.get_by_provider_message_id(
                provider_message_id
            )
            if message is None:
                # Provider sent a webhook for a message we have no record of
                # (e.g. a test send from the Resend dashboard, or a message
                # from before this deployment). Nothing to attach it to.
                return

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
                return

            if event_type in _FAILURE_EVENTS:
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=f"webhook: {event_type.value}",
                )
            await self.uow.commit()
