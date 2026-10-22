# ports/email_sender.py
from typing import Any, Protocol


class EmailSendError(Exception):
    """A send that failed, translated by the adapter into the two things the
    caller (DeliveryService.send_one) needs to decide what happens next:

    - retryable: would trying again later plausibly work? True for rate
      limits, provider outages (5xx) and network errors; False for problems
      a retry can't fix (malformed address, bad API key, rejected payload).
    - retry_after: seconds the provider asked us to wait, if it said.
    - account_blocked: the provider refused because of the account, not this
      message: sending quota used up, bad API key, unverified domain. Every
      message would get the same answer until that's resolved, so the caller
      waits much longer instead of using up attempts.
    """

    def __init__(
        self,
        message: str,
        *,
        retryable: bool,
        retry_after: float | None = None,
        account_blocked: bool = False,
    ) -> None:
        super().__init__(message)
        self.retryable = retryable
        self.retry_after = retry_after
        self.account_blocked = account_blocked


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
        idempotency_key: str | None = None,
    ) -> str:
        """Render `template_key` with `context` and send to `to`.

        Returns the provider's message id (stored on EmailMessage.provider_message_id
        for correlating webhook events later).

        `idempotency_key`: the same key on a repeat call means "the same email"
        -- the provider sends it at most once, so retrying after an unclear
        failure can't deliver a duplicate.

        Raises EmailSendError on failure (never returns a sentinel). Whether
        and when to retry is the caller's decision (DeliveryService.send_one).
        """
        ...
