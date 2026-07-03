# interfaces (Protocols/ABCs) the core depends on
#
# BUGFIX: this port previously had no definition at all, so AuthService had no
# contract to depend on and fell back to a plaintext `plain == hashed` compare
# (see services/auth.py). Define the Protocol the concrete hasher must satisfy.
from typing import Protocol


class PasswordHasherPort(Protocol):
    """Port defining one-way password hashing + verification."""

    def hash(self, plain: str) -> str:
        """Hash a plaintext password for storage."""
        ...

    def verify(self, plain: str, hashed: str) -> bool:
        """Check a plaintext password against a stored hash."""
        ...
