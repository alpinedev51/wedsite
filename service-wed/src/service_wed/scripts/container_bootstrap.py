"""Container-startup bootstrap: run once, automatically, before uvicorn
starts (see the root docker-compose.yml's `service-wed` command). Migrations
(alembic upgrade head, run just before this in that same command) are always
safe to re-run -- already-applied ones are skipped. Seeding is different:
this only ever seeds the admin account / wedding config if the table is
still EMPTY, and never touches either again after that.

That "only if empty" check is the whole point of this file. Without it, a
container restart (a redeploy, a reboot, `docker compose up -d --build`
after an unrelated code change, ...) would silently re-apply whatever's in
ADMIN_PASSWORD/WEDDING_DATE etc. every single time -- clobbering a password
you've since rotated, or a wedding date/venue the couple edited through the
admin UI's Wedding Schedule tab, back to stale .env values. This mirrors
scripts/bootstrap.sh's steps 3 (seed admin) and 5 (seed wedding) but reads
the DB directly through this app's own service layer instead of going
through bootstrap.sh's login-then-curl-itself dance, which only works once
uvicorn is already listening -- here, uvicorn hasn't started yet.

Deliberately doesn't replicate bootstrap.sh's step 6 (upload a blank guest
list) -- an empty CSV import is a genuine no-op (nothing to dedupe/insert),
so there's nothing worth automating there.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import os

from sqlalchemy import select

from service_wed.bootstrap import AppContainer, build_container
from service_wed.models.admin_user import AdminUser
from service_wed.schemas.wedding import WeddingUpsertRequest


def _env_or_none(name: str) -> str | None:
    value = os.environ.get(name, "").strip()
    return value or None


def _env_datetime(name: str) -> dt.datetime | None:
    """WEDDING_DATE/RSVP_DEADLINE/RSVP_OPENS_AT are ISO 8601. Without a
    timezone ("2027-09-04", "2027-06-28T23:59:59") they're Durango local
    time: WeddingUpsertRequest converts them (see config/venue.py). A value
    ending in "Z" or an offset is used as that exact instant."""
    value = _env_or_none(name)
    return dt.datetime.fromisoformat(value) if value else None


async def seed_admin(container: AppContainer) -> None:
    email = _env_or_none("ADMIN_EMAIL")
    password = _env_or_none("ADMIN_PASSWORD")
    if not email or not password:
        print("bootstrap: ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin seed.")
        return

    # No AdminUserRepository.create() exists on purpose -- there's no
    # self-service registration anywhere in this app (see admin_user.py's
    # module docstring), so this reaches past the repository layer the same
    # way scripts/bootstrap.sh's raw `psql -c INSERT INTO admin_users` does,
    # just in Python instead of SQL.
    async with container.session_factory() as session:
        existing = await session.execute(select(AdminUser.id).limit(1))
        if existing.scalar_one_or_none() is not None:
            print("bootstrap: an admin account already exists, skipping.")
            return
        session.add(
            AdminUser(
                email=email, password_hash=container.password_hasher.hash(password)
            )
        )
        await session.commit()
        print(f"bootstrap: seeded admin account ({email}).")


async def seed_wedding(container: AppContainer) -> None:
    wedding_date = _env_datetime("WEDDING_DATE")
    rsvp_deadline = _env_datetime("RSVP_DEADLINE")
    if wedding_date is None or rsvp_deadline is None:
        print("bootstrap: WEDDING_DATE/RSVP_DEADLINE not set, skipping wedding seed.")
        return

    async with container.new_uow() as uow:
        if await uow.wedding_repo.get() is not None:
            print("bootstrap: wedding config already exists, skipping.")
            return

    request = WeddingUpsertRequest(
        wedding_date=wedding_date,
        rsvp_deadline=rsvp_deadline,
        rsvp_opens_at=_env_datetime("RSVP_OPENS_AT"),
        venue_name=_env_or_none("VENUE_NAME"),
        venue_address=_env_or_none("VENUE_ADDRESS"),
        venue_city=_env_or_none("VENUE_CITY"),
        bride_first_name=_env_or_none("BRIDE_FNAME"),
        groom_first_name=_env_or_none("GROOM_FNAME"),
        reminder_cap=int(os.environ.get("REMINDER_CAP", 2)),
        reminder_interval_days=int(os.environ.get("REMINDER_INTERVAL_DAYS", 7)),
    )
    await container.new_wedding_service().upsert(request)
    print("bootstrap: seeded wedding config.")


async def main() -> None:
    container = await build_container()
    try:
        await seed_admin(container)
        await seed_wedding(container)
    finally:
        await container.close()


if __name__ == "__main__":
    asyncio.run(main())
