"""Maps exceptions raised by the service layer to HTTP responses.

Three tiers, most specific first:

1. DomainError (domain/errors.py) -- a service raised a specific business
   error (NotFoundError, ConflictError, ...). Responds with that error's own
   status_code and a {"error": {"code", "message"}} envelope, so the
   frontend can switch on `code` instead of string-matching a message.

2. ValueError -- the older, not-yet-migrated convention: a service raised a
   plain ValueError for a business-rule violation. Still mapped to 400, but
   with the same envelope shape (code "bad_request") so every error response
   from this API looks the same to a client, regardless of which tier
   produced it.

3. Unhandled Exception -- anything that reaches here is a bug, not a
   business rule. Logged with a stack trace (so it shows up wherever this
   service's logs go) and returned as a generic 500 in the same envelope
   shape, rather than leaking a stack trace or a non-JSON body to the client.

Auth/authorization failures (policies/admin.py) raise fastapi.HTTPException
directly instead of going through this module, since FastAPI already
handles that natively and those checks live at the API boundary, not in the
transport-agnostic service layer.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from service_wed.domain.errors import DomainError

logger = logging.getLogger("service_wed.errors")


def _error_body(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


async def _handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    # exc is typed as Exception (not DomainError) to match FastAPI's
    # add_exception_handler signature; it's only ever invoked for DomainError
    # subclasses since that's the only type it's registered against below.
    assert isinstance(exc, DomainError)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.code, str(exc)),
    )


async def _handle_value_error(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=400, content=_error_body("bad_request", str(exc)))


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Anything reaching here escaped every service-layer error convention --
    # log it with a stack trace so it's actually diagnosable, and never hand
    # the client Python's own traceback/message.
    logger.exception("Unhandled exception processing %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_error_body("internal_error", "An unexpected error occurred."),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Called once from main.py's app factory."""
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(ValueError, _handle_value_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
