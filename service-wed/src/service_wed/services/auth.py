# verify password; create/revoke sessions
import datetime as dt
import hashlib
import secrets

from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.auth import AdminLoginRequest, AdminSessionResponse


# Note: In a real app, use passlib or argon2-cffi for verify_password
def verify_password(plain: str, hashed: str) -> bool:
    return plain == hashed


class AuthService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def login(self, request: AdminLoginRequest) -> AdminSessionResponse:
        async with self.uow:
            admin = await self.uow.admin_user_repo.get_by_email(request.email)

            if not admin or not verify_password(request.password, admin.password_hash):
                # Always raise generic errors for auth to prevent email enumeration
                raise ValueError("Invalid email or password")

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
