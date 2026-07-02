import uuid
from typing import Protocol

from service_wed.models.admin_user import AdminUser


class AdminUserRepository(Protocol):
    """Port defining admin user data access."""

    async def get_by_id(self, admin_id: uuid.UUID) -> AdminUser | None:
        """Fetch an admin by their primary key."""
        ...

    async def get_by_email(self, email: str) -> AdminUser | None:
        """Fetch an admin by email (used during login)."""
        ...
