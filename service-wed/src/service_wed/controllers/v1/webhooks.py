"""Resend webhook receiver: translates Resend's payload into the
provider-agnostic call DeliveryService.record_webhook_event() expects.

SECURITY: Resend signs webhooks via Svix (svix-id/svix-timestamp/
svix-signature headers + a signing secret from the Resend dashboard). If
settings.resend_webhook_secret is configured, the signature is verified
before the payload is trusted at all, and a mismatch is rejected with 401 --
otherwise anyone who knows this URL could POST a fake delivery event
(flip a real message to FAILED, or fabricate engagement stats). If no
secret is configured (e.g. local dev without a live Resend account),
verification is skipped with a logged warning rather than blocking local
testing -- this MUST have a secret configured before the endpoint is
reachable from the internet.

ASSUMPTION, not verified against a real Resend payload (no live Resend
account wired up yet): `data.email_id` is the provider message id, and there
is no separate per-event id in the payload -- so provider_event_id is
synthesized from (email_id, type, created_at) instead. If Resend actually
sends a dedicated event id field, switch to using that; it would dedupe
retried webhooks more precisely than this composite key does.
"""

import base64
import hashlib
import hmac
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from service_wed.config.settings import settings
from service_wed.dependencies import get_delivery_service
from service_wed.domain.value_objects import EmailEventType
from service_wed.schemas.webhook import EmailWebhookPayload
from service_wed.services.delivery import DeliveryService

logger = logging.getLogger("service_wed.webhooks")

router = APIRouter(tags=["webhooks"])

# Resend event `type` strings we know how to translate. Anything else (e.g.
# "email.sent", which just echoes state send_one() already recorded) is
# accepted and ignored rather than treated as an error.
_EVENT_TYPE_MAP: dict[str, EmailEventType] = {
    "email.delivered": EmailEventType.DELIVERED,
    "email.opened": EmailEventType.OPENED,
    "email.clicked": EmailEventType.CLICKED,
    "email.bounced": EmailEventType.BOUNCED,
    "email.complained": EmailEventType.COMPLAINED,
}


def _verify_svix_signature(
    *, secret: str, msg_id: str, timestamp: str, signature_header: str, body: bytes
) -> bool:
    """Svix's verification scheme (what Resend signs webhooks with):
    expected = base64(HMAC-SHA256(base64-decoded secret, "{id}.{timestamp}.{body}"))
    compared against each `v1,<sig>` entry in the space-separated
    svix-signature header (there can be more than one during a signing-key
    rotation)."""
    # Secret is handed out as "whsec_<base64>"; the prefix isn't part of the
    # key material.
    secret_b64 = secret.removeprefix("whsec_")
    secret_bytes = base64.b64decode(secret_b64)

    signed_content = f"{msg_id}.{timestamp}.{body.decode()}".encode()
    expected = base64.b64encode(
        hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
    ).decode()

    candidates = [
        part.split(",", 1)[1]
        for part in signature_header.split()
        if part.startswith("v1,")
    ]
    return any(hmac.compare_digest(expected, candidate) for candidate in candidates)


@router.post("/resend", status_code=status.HTTP_200_OK)
async def resend_webhook(
    request: Request,
    delivery_service: Annotated[DeliveryService, Depends(get_delivery_service)],
    svix_id: Annotated[str | None, Header()] = None,
    svix_timestamp: Annotated[str | None, Header()] = None,
    svix_signature: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    # Signature is computed over the exact raw bytes Resend sent -- has to be
    # read before any JSON parsing, since re-serializing a parsed payload is
    # not guaranteed to byte-for-byte match what was signed.
    body = await request.body()

    if settings.resend_webhook_secret is not None:
        if not (
            svix_id and svix_timestamp and svix_signature
        ) or not _verify_svix_signature(
            secret=settings.resend_webhook_secret,
            msg_id=svix_id,
            timestamp=svix_timestamp,
            signature_header=svix_signature,
            body=body,
        ):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, "Invalid webhook signature."
            )
    else:
        logger.warning(
            "RESEND_WEBHOOK_SECRET is not configured -- accepting /webhooks/resend "
            "without verifying its signature. Set it before exposing this endpoint "
            "publicly."
        )

    payload = EmailWebhookPayload.model_validate_json(body)

    event_type = _EVENT_TYPE_MAP.get(payload.type)
    email_id = payload.data.get("email_id")
    if event_type is None or not email_id:
        # Unknown event type or a payload shape we don't recognize. Return
        # 200 anyway so Resend doesn't treat this as a failed delivery and
        # keep retrying it forever -- there's nothing actionable here.
        return {"status": "ignored"}

    provider_event_id = f"{email_id}:{payload.type}:{payload.created_at.isoformat()}"
    await delivery_service.record_webhook_event(
        provider_message_id=email_id,
        event_type=event_type,
        provider_event_id=provider_event_id,
        occurred_at=payload.created_at,
        payload=payload.data,
    )
    return {"status": "ok"}
