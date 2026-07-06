"""Maps exceptions raised by the service layer to HTTP responses.

Every service under services/ signals a business-rule violation by raising a
plain ValueError (bad template_key, campaign already scheduled, RSVP
deadline passed, invalid credentials, ...) -- there's no dedicated domain
error hierarchy yet, ValueError is the established convention across this
codebase. This module is the one place that translates that convention into
an HTTP response, so controllers don't each need their own try/except around
every service call.

Auth/authorization failures (policies/admin.py) raise fastapi.HTTPException
directly instead of ValueError, since FastAPI already handles that natively
and those checks live at the API boundary, not in the transport-agnostic
service layer.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


async def _handle_value_error(request: Request, exc: Exception) -> JSONResponse:
    # exc is typed as Exception (not ValueError) to match FastAPI's
    # add_exception_handler signature; it's only ever invoked for ValueError
    # since that's the only type it's registered against below.
    return JSONResponse(status_code=400, content={"detail": str(exc)})


def register_exception_handlers(app: FastAPI) -> None:
    """Called once from main.py's app factory."""
    app.add_exception_handler(ValueError, _handle_value_error)
