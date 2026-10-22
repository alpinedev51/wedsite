"""Resend adapter. The only file that imports the `resend` package.

Real SDK shape (verified against resend-python 2.x):
  resend.api_key = "..."                              # module-level, not a client object
  await resend.Emails.send_async(params, options)     # options: {"idempotency_key": ...}
Errors are raised as resend.exceptions.ResendError subclasses carrying the
HTTP status in `.code` (RateLimitError for 429). The SDK also raises its own
errors with code 500 and no HTTP response behind them: network failures as
error_type "HttpClientError" (transient), and "AsyncClientNotConfigured" when
httpx isn't installed (a broken install, not a passing problem).
"""

import asyncio
import time
from typing import Any

import resend
from resend.exceptions import RateLimitError, ResendError

from service_wed.lib.templates import render
from service_wed.ports.email_sender import EmailSenderPort, EmailSendError


def _retry_after(headers: dict[str, str]) -> float | None:
    """Resend's Retry-After header (seconds), if it sent one."""
    for name, value in headers.items():
        if name.lower() == "retry-after":
            try:
                return max(0.0, float(value))
            except ValueError:
                return None
    return None


# 429s that mean "quota used up" rather than "slow down". Resend sends all
# three as HTTP 429 (resend.exceptions.ERRORS), told apart by error type.
_QUOTA_ERROR_TYPES = frozenset({"daily_quota_exceeded", "monthly_quota_exceeded"})


def _to_send_error(exc: Exception) -> EmailSendError:
    """Translate a Resend/network failure into retryable vs. permanent."""
    if isinstance(exc, RateLimitError):
        if exc.error_type in _QUOTA_ERROR_TYPES:
            return EmailSendError(
                f"Resend quota used up ({exc.error_type}): {exc.message}",
                retryable=True,
                account_blocked=True,
            )
        return EmailSendError(
            f"Resend rate limit: {exc.message}",
            retryable=True,
            retry_after=_retry_after(exc.headers),
        )
    if isinstance(exc, ResendError):
        try:
            status = int(exc.code)
        except (TypeError, ValueError):
            status = 500
        # 5xx: Resend's side, try again. 4xx: our request is wrong (bad
        # address, bad key, rejected payload) -- a retry gets the same
        # answer. One 4xx is the exception: 409 concurrent_idempotent_requests
        # means a request with the same idempotency key is still in flight,
        # so once it finishes a retry gets its result. (The other 409,
        # invalid_idempotent_request -- same key, different content -- stays
        # permanent: resending can only repeat it.)
        retryable = status >= 500 or exc.error_type == "concurrent_idempotent_requests"
        # 401/403: the API key or the sending domain is the problem (missing
        # or revoked key, domain not verified), so every message would fail
        # the same way. Same for an SDK that can't make async requests at
        # all. Hold them until it's fixed rather than failing a campaign.
        account_blocked = (
            status in (401, 403) or exc.error_type == "AsyncClientNotConfigured"
        )
        return EmailSendError(
            f"Resend error {status} ({exc.error_type}): {exc.message}",
            retryable=retryable or account_blocked,
            account_blocked=account_blocked,
        )
    # Timeouts, DNS, connection resets: transient by nature.
    return EmailSendError(f"{type(exc).__name__}: {exc}", retryable=True)


class ResendEmailSender(EmailSenderPort):
    def __init__(
        self, api_key: str, from_address: str, max_sends_per_second: float = 2.0
    ) -> None:
        resend.api_key = api_key
        self._from = from_address
        # Resend caps API requests per second per account. The worker runs
        # several send jobs at once, so without pacing a campaign fan-out
        # fires them all together and most get 429. Every send in this
        # process passes through _throttle(), which spaces request starts
        # at least 1/max_sends_per_second apart.
        self._min_interval = 1.0 / max_sends_per_second
        self._next_slot = 0.0
        self._lock = asyncio.Lock()

    async def _throttle(self) -> None:
        async with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + self._min_interval
        delay = slot - now
        if delay > 0:
            await asyncio.sleep(delay)

    async def send(
        self,
        *,
        to: str,
        subject: str,
        template_key: str,
        context: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> str:
        html = render(template_key, context)
        params: resend.Emails.SendParams = {
            "from": self._from,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        options: resend.Emails.SendOptions = {}
        if idempotency_key:
            options["idempotency_key"] = idempotency_key

        await self._throttle()
        try:
            response = await resend.Emails.send_async(params, options)
        except Exception as exc:
            raise _to_send_error(exc) from exc
        return response["id"]
