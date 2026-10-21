"""Request ID + one log line per request. Reuses an incoming X-Request-ID
header if a client/proxy already set one, so a request can be traced across
service boundaries instead of getting a new id at every hop.
"""

import logging
import re
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("service_wed.request")

# RSVP magic-link tokens travel in the URL path (/api/v1/rsvp/<token>,
# /api/v1/invitations/<token>). Anyone with a token can read and change that
# household's RSVP, so they shouldn't end up in logs.
_TOKEN_PATH = re.compile(
    r"(/api/v1/(?:rsvp|invitations)/)(?!recover(?:$|[/?]))[^/?\s]+"
)


def redact_path(path: str) -> str:
    """The path with any RSVP token replaced by <token>."""
    return _TOKEN_PATH.sub(r"\1<token>", path)


class RedactTokensFilter(logging.Filter):
    """For uvicorn's access log, whose message args are (client, method,
    path, http_version, status). Attached in main.py."""

    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        if isinstance(args, tuple) and len(args) >= 3 and isinstance(args[2], str):
            record.args = (*args[:2], redact_path(args[2]), *args[3:])
        return True


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        # Stashed on request.state so any handler/dependency can pull it into
        # its own log lines (e.g. to correlate a failed webhook lookup).
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %s (%.1fms) [%s]",
            request.method,
            redact_path(request.url.path),
            response.status_code,
            duration_ms,
            request_id,
        )
        return response
