"""Fixes from the October 2026 audit: manual reminder targeting, webhook
event mapping, CSV decoding, and the API's Cache-Control header."""

import datetime as dt
import uuid
from types import SimpleNamespace

import pytest
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from service_wed.adapters.queue import ArqQueue
from service_wed.controllers.v1.webhooks import _EVENT_TYPE_MAP
from service_wed.domain.errors import ValidationError
from service_wed.domain.value_objects import CampaignType, EmailEventType
from service_wed.middleware.request_context import RequestContextMiddleware
from service_wed.services.campaigns import CampaignService
from service_wed.services.delivery import _FAILURE_EVENTS
from service_wed.services.guest_list import _decode_csv

# --- manual reminder campaigns ----------------------------------------------


def _household(name):
    return SimpleNamespace(
        id=uuid.uuid4(),
        display_name=name,
        contact_email=f"{name.lower()}@example.com",
        invite_token=f"token-{name}",
    )


class _HouseholdRepo:
    def __init__(self, non_responding):
        self.non_responding = non_responding

    async def list_non_responding(self):
        return self.non_responding


class _EmailRepo:
    def __init__(self, invited_ids):
        self.invited_ids = invited_ids

    async def get_invitation_sent_at(self, household_ids):
        now = dt.datetime.now(dt.timezone.utc)
        return {hid: now for hid in household_ids if hid in self.invited_ids}


class _WeddingRepo:
    async def get(self):
        return None


@pytest.mark.asyncio
async def test_manual_reminder_campaign_skips_households_never_invited():
    invited, not_invited = _household("Alpha"), _household("Bravo")
    uow = SimpleNamespace(
        household_repo=_HouseholdRepo([invited, not_invited]),
        email_message_repo=_EmailRepo({invited.id}),
        wedding_repo=_WeddingRepo(),
    )
    campaign = SimpleNamespace(
        id=uuid.uuid4(),
        type=CampaignType.REMINDER,
        subject="Reminder",
        template_key="reminder",
        scheduled_for=dt.datetime.now(dt.timezone.utc),
    )
    messages = await CampaignService(uow)._build_email_messages(campaign)
    assert [m.recipient for m in messages] == ["alpha@example.com"]


# --- webhook events -----------------------------------------------------------


def test_failed_and_suppressed_webhooks_mark_the_email_failed():
    for resend_type in ("email.failed", "email.suppressed", "email.bounced"):
        assert _EVENT_TYPE_MAP[resend_type] in _FAILURE_EVENTS
    assert _EVENT_TYPE_MAP["email.delivered"] == EmailEventType.DELIVERED


# --- CSV upload decoding --------------------------------------------------------


def test_csv_from_excel_with_byte_order_mark_keeps_first_column_name():
    text = _decode_csv("﻿HouseholdName,ContactEmail\n".encode("utf-8"))
    assert text.startswith("HouseholdName,")


def test_csv_in_another_encoding_gets_a_clear_error():
    with pytest.raises(ValidationError, match="UTF-8"):
        _decode_csv("HouseholdName\nJosé\n".encode("cp1252"))


# --- Cache-Control --------------------------------------------------------------


@pytest.mark.asyncio
async def test_api_responses_are_not_cacheable():
    async def csv(request):
        return PlainTextResponse("a,b\n", media_type="text/csv")

    app = Starlette(routes=[Route("/api/v1/admin/exports/guests.csv", csv)])
    app.add_middleware(RequestContextMiddleware)

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/v1/admin/exports/guests.csv",
        "raw_path": b"/api/v1/admin/exports/guests.csv",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 1234),
        "server": ("test", 80),
    }
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    start = next(m for m in sent if m["type"] == "http.response.start")
    headers = dict(start["headers"])
    assert headers[b"cache-control"] == b"no-store"


# --- worker health through the queue port -------------------------------------


class _FakeRedis:
    def __init__(self, keys):
        self.keys = keys

    async def exists(self, key):
        return 1 if key in self.keys else 0


@pytest.mark.asyncio
async def test_worker_alive_reads_the_arq_health_key():
    assert await ArqQueue(_FakeRedis({"arq:queue:health-check"})).worker_alive()
    assert not await ArqQueue(_FakeRedis(set())).worker_alive()


# --- webhook that arrives before send_one recorded the email id ---------------


class _UnmatchedDelivery:
    async def record_webhook_event(self, **kwargs):
        return False  # no message with that provider id (yet)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("age", "expected"), [(dt.timedelta(seconds=5), 503), (dt.timedelta(hours=4), 200)]
)
async def test_unmatched_webhook_is_retried_only_while_recent(
    monkeypatch, age, expected
):
    import httpx
    from fastapi import FastAPI

    from service_wed.config.settings import settings
    from service_wed.controllers.v1 import webhooks
    from service_wed.dependencies import get_delivery_service

    monkeypatch.setattr(settings, "resend_webhook_secret", None)
    monkeypatch.setattr(settings, "debug", True)  # skip signing in this test
    app = FastAPI()
    app.include_router(webhooks.router)
    app.dependency_overrides[get_delivery_service] = lambda: _UnmatchedDelivery()

    created = (dt.datetime.now(dt.timezone.utc) - age).isoformat()
    body = {
        "type": "email.suppressed",
        "created_at": created,
        "data": {"email_id": "e1"},
    }
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        response = await client.post("/resend", json=body)
    assert response.status_code == expected
