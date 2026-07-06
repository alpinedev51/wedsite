"""Deliver: the two things that happen after a campaign fans out.

1. dispatch_due() -- the work's per tick job.

2. record_webhook_event() -- the provider calling back to say what happened to a message we already send.

This service takes clean, provider-agnostic arguments (EmailEventType, provider_event_id, occurred_at)
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from service_wed.domain.value_objects import EmailEventType, EmailStatus
from service_wed.models.email_message import EmailMessage
from service_wed.ports.email_sender import EmailSenderPort
from service_wed.ports.uow import UnitOfWorkPort

_FAILURE_EVENTS = frozenset(
    {
        EmailEventType.BOUNCED,
        EmailEventType.COMPLAINED,
        EmailEventType.DROPPED,
        EmailEventType.FAILED,
    }
)


class DeliveryService:
    def __init__(self, uow: UnitOfWorkPort, email_sender: EmailSenderPort) -> None:
        self.uow = uow
        self.email_sender = email_sender

    async def dispatch_due(self, limit: int = 100) -> int:
        """Claim up to limit due messages and attempt to send each one."""
        async with self.uow:
            messages = await self.uow.email_message_repo.claim_due(limit=limit)
            await self.uow.commit()

        for message in messages:
            await self._send_one(message)
        return len(messages)

    async def _send_one(self, message: EmailMessage) -> None:
        """Send one already-claimed message and persist the outcome."""
        async with self.uow:
            try:
                provider_message_id = await self.email_sender.send(
                    to=message.recipient,
                    subject=message.subject,
                    template_key=message.template_key,
                    context=message.context or {},
                )
            except Exception as e:
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=str(e),
                    increment_attempts=True,
                )
            else:
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
    ):
        """Persist a provider webhook callback and if it's a failure event flip the message to FAILED."""
        async with self.uow:
            message = await self.uow.email_message_repo.get_by_provider_message_id(
                provider_message_id
            )
            if message is None:
                return
            event = await self.uow.email_event_repo.create(
                email_message_id=message.id,
                event_type=event_type,
                provider_event_id=provider_event_id,
                occurred_at=occurred_at,
                payload=payload,
            )
            if event is None:
                return
            if event_type in _FAILURE_EVENTS:
                await self.uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=f"webhook: {event_type.value}",
                )
            await self.uow.commit()
