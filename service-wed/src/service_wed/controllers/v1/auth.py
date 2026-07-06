"""Admin login/logout. Sessions are a server-side revocable row (AdminSession)
identified by an httponly cookie holding the raw token -- the DB only ever
stores its hash (see services/auth.py)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from service_wed.config.settings import settings
from service_wed.dependencies import get_auth_service
from service_wed.models.admin_user import AdminUser
from service_wed.policies.admin import require_admin
from service_wed.schemas.auth import AdminLoginRequest
from service_wed.schemas.common import SuccessResponse
from service_wed.services.auth import AuthService

router = APIRouter(tags=["auth"])


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    request: AdminLoginRequest,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> SuccessResponse:
    result = await auth_service.login(request)

    # The raw token goes in an httponly cookie only, never in the JSON body --
    # that's the one place it needs to live for require_admin to read it back
    # later, and keeping it out of the body limits exposure if a response
    # ever gets logged or echoed somewhere unexpected.
    response.set_cookie(
        key=settings.session_cookie_name,
        value=result.token,
        httponly=True,
        secure=not settings.debug,  # allow plain http locally; require it elsewhere
        samesite="lax",
        expires=result.expires_at,
    )
    return SuccessResponse(success=True, message="Logged in.")


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    _admin: Annotated[AdminUser, Depends(require_admin)],
) -> SuccessResponse:
    raw_token = request.cookies.get(settings.session_cookie_name)
    if raw_token is not None:
        await auth_service.logout(raw_token)
    response.delete_cookie(key=settings.session_cookie_name)
    return SuccessResponse(success=True, message="Logged out.")
