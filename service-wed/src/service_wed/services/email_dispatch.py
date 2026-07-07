"""RECOMMENDED DELETE: this module is fully superseded by services/delivery.py
(DeliveryService.claim_and_enqueue() + send_one()), which splits "claim due
messages" and "send one message" into two separately-queued steps so a slow
provider call only blocks its own arq job instead of this function's whole
batch. Nothing imports this module -- worker.py wires up
tasks/dispatch.py:dispatch_due_emails instead, which is a *different*
function that happens to share this one's name. That name collision is a
real hazard: it's easy to mistake this dead function for the live one (it
already caused confusion once this session). Keeping this file around
serves no purpose other than that risk.

Original docstring, for context on what this used to do:
Use case: claim due email_messages and send them. Orchestrates the UoW and
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
