"""Sending one email: retries, final failure, duplicates (services/delivery.py)
and the Resend adapter's error translation and pacing (adapters/email/resend.py)."""

import datetime as dt
import time
import uuid
from types import SimpleNamespace

import pytest
from resend.exceptions import RateLimitError, ResendError, ValidationError

from service_wed.adapters.email.resend import ResendEmailSender, _to_send_error
from service_wed.domain.value_objects import EmailStatus
from service_wed.ports.email_sender import EmailSendError
from service_wed.services.delivery import (
    MAX_SEND_ATTEMPTS,
    ACCOUNT_BLOCKED_GIVE_UP_AFTER,
    ACCOUNT_BLOCKED_RETRY_DELAY,
    DeliveryService,
    RetryLater,
    retry_delay,
)

# --- fakes -----------------------------------------------------------------


class FakeRepo:
    def __init__(self, message):
        self.message = message

    async def get_by_id(self, message_id):
        return self.message if self.message.id == message_id else None

    async def update_status(
        self,
        message_id,
        status,
        provider_message_id=None,
        last_error=None,
        increment_attempts=False,
    ):
        m = self.message
        m.status = status
        if provider_message_id is not None:
            m.provider_message_id = provider_message_id
        if last_error is not None:
            m.last_error = last_error
        if increment_attempts:
            m.attempts += 1

    async def reschedule(self, message_id, scheduled_for, last_error):
        m = self.message
        m.status = EmailStatus.SCHEDULED
        m.scheduled_for = scheduled_for
        m.last_error = last_error
        if m.send_blocked_since is None:
            m.send_blocked_since = dt.datetime.now(dt.timezone.utc)


class FakeUow:
    def __init__(self, repo):
        self.email_message_repo = repo
        self.commits = 0
        self.open = False  # inside `async with` (a transaction would be open)

    async def __aenter__(self):
        self.open = True
        return self

    async def __aexit__(self, *exc):
        self.open = False
        return False

    async def commit(self):
        self.commits += 1


class FakeSender:
    def __init__(self, error=None):
        self.error = error
        self.calls = []
        self.uow = None  # set by service(); checked during send

    async def send(self, *, to, subject, template_key, context, idempotency_key=None):
        # The provider call must happen with no DB transaction open.
        assert self.uow is None or not self.uow.open
        self.calls.append(idempotency_key)
        if self.error:
            raise self.error
        return "provider-123"


def make_message(attempts=0, status=EmailStatus.SENDING, blocked_for=None):
    now = dt.datetime.now(dt.timezone.utc)
    return SimpleNamespace(
        id=uuid.uuid4(),
        # Created long ago on purpose: the give-up clock must not use this.
        created_at=now - dt.timedelta(days=30),
        send_blocked_since=now - blocked_for if blocked_for else None,
        status=status,
        attempts=attempts,
        recipient="guest@example.com",
        subject="Hi",
        template_key="rsvp_invite",
        context={},
        idempotency_key="campaign-1:household-1",
        provider_message_id=None,
        last_error=None,
    )


def service(message, sender):
    uow = FakeUow(FakeRepo(message))
    sender.uow = uow
    return DeliveryService(uow, sender, queue=None)


# --- the original bug: failures were never retried ---------------------------


@pytest.mark.asyncio
async def test_retryable_failure_asks_for_retry_and_stays_sending():
    message = make_message(attempts=0)
    sender = FakeSender(EmailSendError("429", retryable=True))
    with pytest.raises(RetryLater) as raised:
        await service(message, sender).send_one(message.id)
    assert raised.value.delay_seconds == 30
    assert message.status == EmailStatus.SENDING
    assert message.attempts == 1


@pytest.mark.asyncio
async def test_last_attempt_marks_failed_instead_of_retrying():
    message = make_message(attempts=MAX_SEND_ATTEMPTS - 1)
    sender = FakeSender(EmailSendError("429", retryable=True))
    await service(message, sender).send_one(message.id)  # no RetryLater
    assert message.status == EmailStatus.FAILED
    assert message.attempts == MAX_SEND_ATTEMPTS


@pytest.mark.asyncio
async def test_permanent_failure_is_not_retried():
    message = make_message()
    sender = FakeSender(EmailSendError("bad address", retryable=False))
    await service(message, sender).send_one(message.id)
    assert message.status == EmailStatus.FAILED
    assert len(sender.calls) == 1


@pytest.mark.asyncio
async def test_unexpected_error_is_final_not_a_loop():
    message = make_message()
    sender = FakeSender(RuntimeError("template exploded"))
    await service(message, sender).send_one(message.id)
    assert message.status == EmailStatus.FAILED


@pytest.mark.asyncio
async def test_success_passes_idempotency_key():
    message = make_message()
    sender = FakeSender()
    await service(message, sender).send_one(message.id)
    assert message.status == EmailStatus.SENT
    assert message.provider_message_id == "provider-123"
    assert sender.calls == ["campaign-1:household-1"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status", [EmailStatus.SENT, EmailStatus.FAILED, EmailStatus.SCHEDULED]
)
async def test_only_claimed_messages_are_sent(status):
    message = make_message(status=status)
    sender = FakeSender()
    await service(message, sender).send_one(message.id)
    assert sender.calls == []


@pytest.mark.asyncio
async def test_quota_used_up_reschedules_without_using_an_attempt():
    message = make_message(attempts=MAX_SEND_ATTEMPTS - 1)  # last attempt
    sender = FakeSender(
        EmailSendError("daily quota", retryable=True, account_blocked=True)
    )
    before = dt.datetime.now(dt.timezone.utc)
    await service(message, sender).send_one(message.id)  # no RetryLater
    # Not FAILED even on the last attempt: it goes out once the quota resets.
    assert message.status == EmailStatus.SCHEDULED
    assert message.attempts == MAX_SEND_ATTEMPTS - 1
    assert message.scheduled_for >= before + ACCOUNT_BLOCKED_RETRY_DELAY
    assert "daily quota" in message.last_error


@pytest.mark.asyncio
async def test_quota_still_used_up_after_days_marks_failed():
    message = make_message(
        blocked_for=ACCOUNT_BLOCKED_GIVE_UP_AFTER + dt.timedelta(minutes=1)
    )
    sender = FakeSender(
        EmailSendError("monthly quota", retryable=True, account_blocked=True)
    )
    await service(message, sender).send_one(message.id)
    assert message.status == EmailStatus.FAILED
    assert "still refused" in message.last_error


@pytest.mark.asyncio
async def test_give_up_clock_starts_at_first_refusal_not_creation():
    # A campaign locked in weeks before its send date hits the quota on send
    # day: it must wait for the quota, not fail on the spot.
    message = make_message()  # created 30 days ago, never blocked
    sender = FakeSender(EmailSendError("quota", retryable=True, account_blocked=True))
    await service(message, sender).send_one(message.id)
    assert message.status == EmailStatus.SCHEDULED
    assert message.send_blocked_since is not None


@pytest.mark.asyncio
async def test_reclaimed_on_last_attempt_still_gets_one_real_try():
    # claim_due counts each reclaim of a stuck message as an attempt. The
    # interrupted attempt may have reached Resend, and a retry with the same
    # idempotency key just returns the original id -- so try once more.
    message = make_message(attempts=MAX_SEND_ATTEMPTS)
    sender = FakeSender()
    await service(message, sender).send_one(message.id)
    assert sender.calls == ["campaign-1:household-1"]
    assert message.status == EmailStatus.SENT


@pytest.mark.asyncio
async def test_extra_try_failing_is_final():
    message = make_message(attempts=MAX_SEND_ATTEMPTS)
    sender = FakeSender(EmailSendError("503", retryable=True))
    await service(message, sender).send_one(message.id)  # no RetryLater
    assert message.status == EmailStatus.FAILED


@pytest.mark.asyncio
async def test_interrupted_again_after_the_extra_try_gives_up_without_sending():
    message = make_message(attempts=MAX_SEND_ATTEMPTS + 1)
    sender = FakeSender()
    await service(message, sender).send_one(message.id)
    assert sender.calls == []
    assert message.status == EmailStatus.FAILED
    assert "interrupted" in message.last_error


def test_retry_delay_backs_off_and_is_capped():
    assert [retry_delay(n) for n in (1, 2, 3, 4)] == [30, 60, 120, 240]
    assert retry_delay(1, retry_after=90) == 90
    assert retry_delay(10) == 600
    assert retry_delay(1, retry_after=86_400) == 600


# --- Resend adapter ----------------------------------------------------------


def test_resend_errors_are_classified():
    rate = _to_send_error(
        RateLimitError("slow down", "rate_limit_exceeded", "429", {"retry-after": "2"})
    )
    assert rate.retryable and rate.retry_after == 2.0
    assert _to_send_error(ResendError(503, "unavailable", "down", "")).retryable
    assert not _to_send_error(
        ValidationError("bad to", "validation_error", "422")
    ).retryable
    assert _to_send_error(TimeoutError("timed out")).retryable
    assert not rate.account_blocked
    # 409: a request with the same idempotency key is still in flight.
    assert _to_send_error(
        ResendError(409, "concurrent_idempotent_requests", "in progress", "")
    ).retryable
    # 401/403: the key or the sending domain -- hold, don't fail everything.
    for status in (401, 403):
        err = _to_send_error(ResendError(status, "invalid_api_key", "bad key", ""))
        assert err.account_blocked and err.retryable
    assert not _to_send_error(
        ValidationError("bad to", "validation_error", "422")
    ).account_blocked
    # SDK-local errors (code 500, no HTTP response behind them).
    assert _to_send_error(
        ResendError(500, "HttpClientError", "connection reset", "")
    ).retryable
    no_httpx = _to_send_error(
        ResendError(500, "AsyncClientNotConfigured", "install httpx", "")
    )
    assert no_httpx.account_blocked
    # 409: same key, different content -- resending can only repeat it.
    assert not _to_send_error(
        ResendError(409, "invalid_idempotent_request", "mismatch", "")
    ).retryable


def test_resend_quota_errors_are_told_apart_from_rate_limits():
    for error_type in ("daily_quota_exceeded", "monthly_quota_exceeded"):
        err = _to_send_error(RateLimitError("quota", error_type, "429", {}))
        assert err.account_blocked and err.retryable


@pytest.mark.asyncio
async def test_resend_sender_paces_requests():
    sender = ResendEmailSender("re_test", "a@example.com", max_sends_per_second=10)
    start = time.monotonic()
    for _ in range(4):
        await sender._throttle()
    # 4 sends at 10/s: the 4th may start no earlier than 0.3s after the 1st.
    assert time.monotonic() - start >= 0.29
