"""Use case: claim due email_messages and send them. Orchestrates the UoW and
the EmailSenderPort — belongs here, not in the repository adapter.
"""

from service_wed.domain.value_objects import EmailStatus
from service_wed.ports.email_sender import EmailSenderPort
from service_wed.ports.uow import UnitOfWorkPort


async def dispatch_due_emails(uow: UnitOfWorkPort, sender: EmailSenderPort) -> None:
    # Claim-and-commit first: FOR UPDATE holds row locks until the transaction
    # ends. Committing here releases them before the slow provider call.
    async with uow:
        claimed = await uow.email_message_repo.claim_due(limit=100)
        await uow.commit()

    for message in claimed:
        try:
            provider_id = await sender.send(
                to=message.recipient,
                subject=message.subject,
                template_key=message.template_key,
                context=message.context or {},
            )
            async with uow:
                await uow.email_message_repo.update_status(
                    message.id, EmailStatus.SENT, provider_message_id=provider_id
                )
                await uow.commit()
        except Exception as exc:  # noqa: BLE001 — any send failure marks the row failed
            async with uow:
                await uow.email_message_repo.update_status(
                    message.id,
                    EmailStatus.FAILED,
                    last_error=str(exc),
                    increment_attempts=True,
                )
                await uow.commit()
