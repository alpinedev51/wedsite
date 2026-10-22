import uuid

from service_wed.ports.email_sender import EmailSenderPort


class ConsoleEmailSender(EmailSenderPort):
    """Prints instead of sending. Wire this in local dev / pytest so nothing
    ever hits a real inbox by accident."""

    async def send(
        self, *, to, subject, template_key, context, idempotency_key=None
    ) -> str:
        print(
            f"[EMAIL] to={to} subject={subject!r} template={template_key} ctx={context}"
        )
        return f"console-{uuid.uuid4()}"
