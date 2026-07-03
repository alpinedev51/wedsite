# ports/email.py
from typing import Any, Protocol


class EmailSenderPort(Protocol):
    """Port for sending a single transactional email through whatever provider
    is configured. Implementations live in adapters/email/ (resend.py for
    production, console.py for local dev/tests).
    """

    async def send(
        self,
        *,
        to: str,
        subject: str,
        template_key: str,
        context: dict[str, Any],
    ) -> str:
        """Render `template_key` with `context` and send to `to`.

        Returns the provider's message id (stored on EmailMessage.provider_message_id
        for correlating webhook events later).

        Raises on failure — never returns a sentinel/None for a failed send.
        The caller (dispatch_due_emails) decides what failure means: it catches
        the exception and marks the row FAILED with the retry/attempt count.
        The port doesn't know about retries; that's an orchestration decision.
        """
        ...
