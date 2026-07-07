"""Scrypt-based password hasher.

Stored format: "scrypt$<n>$<r>$<p>$<salt_hex>$<hash_hex>" so the cost
parameters travel with the hash and can change later without invalidating
existing rows.
"""

from __future__ import annotations

import hashlib
import secrets

from service_wed.ports.password_hasher import PasswordHasherPort

_N = 2**14
_R = 8
_P = 1
_KEY_LEN = 32


class ScryptPasswordHasher(PasswordHasherPort):
    def hash(self, plain: str) -> str:
        """Salt + scrypt-hash a plaintext password for storage."""
        salt = secrets.token_bytes(16)
        derived = hashlib.scrypt(
            plain.encode("utf-8"), salt=salt, n=_N, r=_R, p=_P, dklen=_KEY_LEN
        )
        return f"scrypt${_N}${_R}${_P}${salt.hex()}${derived.hex()}"

    def verify(self, plain: str, hashed: str) -> bool:
        """Re-derive with the stored salt/params and compare in constant time.
        Any malformed `hashed` value (wrong format, bad hex) fails closed."""
        try:
            algo, n, r, p, salt_hex, hash_hex = hashed.split("$")
            if algo != "scrypt":
                return False
            derived = hashlib.scrypt(
                plain.encode("utf-8"),
                salt=bytes.fromhex(salt_hex),
                n=int(n),
                r=int(r),
                p=int(p),
                dklen=len(hash_hex) // 2,
            )
            return secrets.compare_digest(derived.hex(), hash_hex)
        except (ValueError, TypeError):
            return False
