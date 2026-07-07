# verify password; create/revoke sessions
import datetime as dt
import hashlib
import secrets

from service_wed.domain.errors import InvalidCredentialsError
from service_wed.ports.password_hasher import PasswordHasherPort
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.auth import AdminLoginRequest, AdminSessionResponse

# A syntactically-valid scrypt hash of an unguessable value, used only to
# give login() something to hash against when the email doesn't match any
# admin -- so a bad email pays the same scrypt cost as a bad password
# instead of returning near-instantly. See login()'s comment below.
_DUMMY_HASH = (
    "scrypt$16384$8$1"
    "$00000000000000000000000000000000"
    "$0000000000000000000000000000000000000000000000000000000000000000"
)


class AuthService:
    """Login/logout for the single admin account: verifies credentials and
    creates/revokes AdminSession rows. See policies/admin.py:require_admin
    for how a session is validated on subsequent requests."""

    def __init__(
        self, uow: UnitOfWorkPort, password_hasher: PasswordHasherPort
    ) -> None:
        self.uow = uow
        self.password_hasher = password_hasher

    async def login(self, request: AdminLoginRequest) -> AdminSessionResponse:
        async with self.uow:
            admin = await self.uow.admin_user_repo.get_by_email(request.email)

            # Always call verify(), even for a nonexistent email, against a
            # dummy hash -- otherwise `not admin or ...` short-circuits and
            # skips the (deliberately slow) scrypt computation, making a bad
            # email respond measurably faster than a bad password and
            # letting response timing enumerate which emails are registered.
            password_hash = admin.password_hash if admin else _DUMMY_HASH
            password_ok = self.password_hasher.verify(request.password, password_hash)

            if not admin or not password_ok:
                # 401, not 404/400: identical response body whether the email
                # doesn't exist or the password is wrong, so the response
                # can't be used to enumerate admin emails.
                raise InvalidCredentialsError("Invalid email or password.")

            # 1. Generate a raw, cryptographically secure token
            raw_token = secrets.token_urlsafe(32)

            # 2. Hash it before storing in the database
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)

            # 3. Store the hash
            await self.uow.admin_session_repo.create(
                admin_id=admin.id, token_hash=token_hash, expires_at=expires_at
            )
            await self.uow.commit()

            # 4. Return the RAW token to the user (this is their only time seeing it)
            return AdminSessionResponse(token=raw_token, expires_at=expires_at)

    # Added so controllers/v1/auth.py's logout endpoint has something to call
    # -- previously only login() existed, so there was no way to revoke a
    # session server-side.
    async def logout(self, raw_token: str) -> None:
        """Revoke the session identified by the raw cookie value. Silently
        no-ops if the token doesn't match a session -- logging out of a
        session that's already gone isn't an error from the caller's POV."""
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        async with self.uow:
            session = await self.uow.admin_session_repo.get_by_token_hash(token_hash)
            if session is not None:
                await self.uow.admin_session_repo.revoke(session.id)
                await self.uow.commit()
