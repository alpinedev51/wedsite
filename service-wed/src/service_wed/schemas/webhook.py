# provider webhook payload DTOs
import datetime as dt
from typing import Any
from pydantic import BaseModel


class EmailWebhookPayload(BaseModel):
    """Shape depends heavily on your provider (e.g., Resend)."""

    type: str
    created_at: dt.datetime
    data: dict[str, Any]
