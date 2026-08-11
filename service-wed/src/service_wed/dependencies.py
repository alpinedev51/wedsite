from typing import Annotated

from fastapi import Depends, Request

from service_wed.bootstrap import AppContainer
from service_wed.services.auth import AuthService
from service_wed.services.campaigns import CampaignService
from service_wed.services.dashboard import DashboardService
from service_wed.services.delivery import DeliveryService
from service_wed.services.exports import ExportService
from service_wed.services.guest_list import GuestListService
from service_wed.services.invitation_lookup import InvitationService
from service_wed.services.reminders import ReminderService
from service_wed.services.rsvp import RsvpService
from service_wed.services.wedding import WeddingService


def get_container(request: Request) -> AppContainer:
    """The single AppContainer built at startup; see hooks/lifespan.py."""
    container: AppContainer = request.app.state.container
    return container


def get_auth_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> AuthService:
    return container.new_auth_service()


def get_rsvp_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> RsvpService:
    return container.new_rsvp_service()


def get_guest_list_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> GuestListService:
    return container.new_guest_list_service()


def get_invitation_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> InvitationService:
    return container.new_invitation_service()


def get_campaign_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> CampaignService:
    return container.new_campaign_service()


def get_delivery_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> DeliveryService:
    return container.new_delivery_service()


def get_reminder_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> ReminderService:
    return container.new_reminder_service()


def get_dashboard_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> DashboardService:
    return container.new_dashboard_service()


def get_export_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> ExportService:
    return container.new_export_service()


def get_wedding_service(
    container: Annotated[AppContainer, Depends(get_container)],
) -> WeddingService:
    return container.new_wedding_service()
