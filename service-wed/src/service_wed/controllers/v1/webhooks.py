"""Resend webhook receiver: translates Resend's payload into the
provider-agnostic call DeliveryService.record_webhook_event() expects.

SECURITY: this does NOT verify the webhook signature yet. Resend signs
webhooks via Svix (svix-id/svix-timestamp/svix-signature headers + a signing
secret from the Resend dashboard); right now anyone who knows this URL can
POST a fake delivery event. That's acceptable for local dev but MUST be
closed (verify the signature, reject if it doesn't match) before this goes
live.

ASSUMPTION, not verified against a real Resend payload (no live Resend
account wired up yet): `data.email_id` is the provider message id, and there
is no separate per-event id in the payload -- so provider_event_id is
synthesized from (email_id, type, created_at) instead. If Resend actually
sends a dedicated event id field, switch to using that; it would dedupe
retried webhooks more precisely than this composite key does.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from service_wed.dependencies import get_delivery_service
from service_wed.domain.value_objects import EmailEventType
from service_wed.schemas.webhook import EmailWebhookPayload
from service_wed.services.delivery import DeliveryService

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


@router.post("/resend", status_code=status.HTTP_200_OK)
async def resend_webhook(
    payload: EmailWebhookPayload,
    delivery_service: Annotated[DeliveryService, Depends(get_delivery_service)],
) -> dict[str, str]:
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
