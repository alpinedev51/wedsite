"""Import every model so `Base.metadata` is complete.

Alembic autogenerate only sees tables whose classes have been imported. Import
this package in the Alembic env before `target_metadata = Base.metadata`.

(`subscribers` is deferred — added in its own migration when that feature is built.)
"""

from service_wed.models.base import Base
from service_wed.models.admin_session import AdminSession
from service_wed.models.admin_user import AdminUser
from service_wed.models.campaign import Campaign
from service_wed.models.email_event import EmailEvent
from service_wed.models.email_message import EmailMessage
from service_wed.models.guest import Guest
from service_wed.models.household import Household
from service_wed.models.rsvp_response import RsvpResponse
from service_wed.models.wedding import Wedding

__all__ = [
    "Base",
    "Wedding",
    "Household",
    "Guest",
    "RsvpResponse",
    "Campaign",
    "EmailMessage",
    "EmailEvent",
    "AdminUser",
    "AdminSession",
]
