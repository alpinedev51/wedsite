# status lookup; magic-link recovery to on-file email
from service_wed.domain.errors import NotFoundError
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.invitation import InvitationResponse, MagicLinkRecoveryRequest
from service_wed.schemas.common import SuccessResponse


class InvitationService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def get_invitation_by_token(self, token: str) -> InvitationResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_invite_token(token)
            if not household:
                raise NotFoundError("Invalid or expired invitation token.")

            # Pydantic's model_validate automatically reads the ORM object and
            # the @property accessors we added for rsvp_status/meal_choice
            return InvitationResponse.model_validate(household)

    async def recover_magic_link(
        self, request: MagicLinkRecoveryRequest
    ) -> SuccessResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_email(request.email)

            if household:
                # To prevent spam, check if they've requested recently, then:
                # 1. Generate an EmailMessage for this household
                # 2. Embed household.invite_token in the email payload
                # 3. Await self.uow.email_message_repo.create_batch([msg])
                pass

            await self.uow.commit()

            # Always return success even if email isn't found to prevent data leakage
            return SuccessResponse(
                success=True,
                message="If that email is on our list, a new link has been sent.",
            )
