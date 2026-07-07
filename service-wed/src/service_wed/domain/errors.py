"""Domain exception hierarchy.

Every service used to signal a business-rule violation with a plain
ValueError -- exceptions.py mapped that convention to a 400 with
{"detail": "<message>"}. That's fine for a human reading the message, but a
frontend can't safely branch on it ("show a different UI when the RSVP
deadline has passed") without string-matching English prose, which breaks
the moment the wording changes.

DomainError gives each meaningful failure a stable machine-readable `code`
and an appropriate HTTP `status_code`, so exceptions.py can return a
{"error": {"code", "message"}} envelope the frontend can actually switch on.
Bare ValueError is still supported as a fallback (see exceptions.py) for
call sites that haven't been migrated to a specific subclass yet -- it's a
convention, not a hard requirement.
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for every business-rule violation raised by services/.

    Subclasses set `code` (a stable, frontend-facing identifier) and
    `status_code` (the HTTP status exceptions.py should respond with).
    """

    code: str = "domain_error"
    status_code: int = 400

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.code)


class NotFoundError(DomainError):
    """A requested resource (campaign, household, invitation token, ...)
    doesn't exist."""

    code = "not_found"
    status_code = 404


class ConflictError(DomainError):
    """The request is well-formed, but the resource's current state doesn't
    allow it (e.g. rescheduling a campaign that's already sent)."""

    code = "conflict"
    status_code = 409


class ValidationError(DomainError):
    """Input failed a business-rule check that isn't expressible as a
    Pydantic field constraint (e.g. a scheduled_for in the past)."""

    code = "validation_error"
    status_code = 400


class InvalidCredentialsError(DomainError):
    """Login failed -- unknown email or wrong password. Deliberately vague
    (never says which) so the response itself can't be used to enumerate
    registered admin emails."""

    code = "invalid_credentials"
    status_code = 401


class RsvpClosedError(DomainError):
    """The RSVP window isn't open yet, or the deadline has already passed."""

    code = "rsvp_closed"
    status_code = 409
