"""Resend adapter. The only file that imports the `resend` package.

Real SDK shape (verified against resend-python's own docs, not assumed):
  resend.api_key = "..."                       # module-level, not a client object
  await resend.Emails.send_async(params)        # requires the SDK's async extra
  resend.Emails.send(params)                    # sync variant exists too

There is no `resend.Client(api_key)` constructor — an earlier draft of this
file invented one; this version matches the actual package.
"""

from typing import Any

import resend

from service_wed.lib.templates import render
from service_wed.ports.email_sender import EmailSenderPort


class ResendEmailSender(EmailSenderPort):
    def __init__(self, api_key: str, from_address: str) -> None:
        resend.api_key = api_key
        self._from = from_address

    async def send(
        self, *, to: str, subject: str, template_key: str, context: dict[str, Any]
    ) -> str:
        html = render(template_key, context)
        params: resend.Emails.SendParams = {
            "from": self._from,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        response = await resend.Emails.send_async(params)
        return response["id"]
