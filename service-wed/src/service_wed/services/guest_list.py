# CSV import; edit households; generate token + short code
import csv
import io
import secrets
import uuid
from dataclasses import dataclass, field

from pydantic import EmailStr, TypeAdapter
from pydantic import ValidationError as PydanticValidationError

from service_wed.domain.errors import NotFoundError, ValidationError
from service_wed.models.guest import Guest
from service_wed.models.household import Household
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import Page
from service_wed.schemas.household import GuestImportResponse, HouseholdAdminView
from service_wed.services.exports import FORMULA_PREFIXES

_REQUIRED_COLUMNS = ("HouseholdName", "ContactEmail", "GuestName", "IsPlusOne")
_ID_COLUMNS = ("HouseholdId", "GuestId")
_PLUS_ONES_COLUMN = "PlusOnesAllowed"
# Plenty for a wedding; also the RSVP request's cap on plus-ones.
_MAX_PLUS_ONES = 10

# The same check the admin views (schemas/household.py) apply when they
# read an email back out. Checking here keeps a bad cell out of the
# database, where it would otherwise break GET /admin/households.
_EMAIL = TypeAdapter(EmailStr)

_PLUS_ONE_TRUE = {"true", "yes", "y", "1"}
_PLUS_ONE_FALSE = {"false", "no", "n", "0", ""}


@dataclass
class _CleanedGuestRow:
    line_number: int
    household_name: str
    contact_email: str | None
    guest_name: str
    is_plus_one: bool
    household_id: uuid.UUID | None = None
    guest_id: uuid.UUID | None = None
    household_name_given: bool = True
    # None = the cell is blank or the file has no PlusOnesAllowed column.
    plus_ones_allowed: int | None = None


@dataclass
class _HouseholdPlan:
    """Every row of the file that belongs to one household, and the
    household it resolved to (None = it doesn't exist yet)."""

    rows: list[_CleanedGuestRow] = field(default_factory=list)
    household: Household | None = None
    name: str = ""
    renamed_by_id: bool = False


def _q(name: str) -> str:
    """A name quoted for a message shown to the couple."""
    return f'"{name}"'


def _decode_csv(file_bytes: bytes) -> str:
    """The upload as text. utf-8-sig, not utf-8: Excel's "CSV UTF-8" format
    starts the file with an invisible byte-order mark, which plain utf-8
    would keep as part of the first column name ("\ufeffHouseholdName"),
    so the import would report HouseholdName as missing."""
    try:
        return file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ValidationError(
            'The file isn\'t UTF-8 text. Export it as "CSV UTF-8" (Excel) or '
            '"Comma-separated values" (Google Sheets, Numbers) and try again.'
        ) from None


def _cell(row: dict, column: str) -> str:
    """A cell's text, trimmed. The export puts a ' in front of text that
    starts like a spreadsheet formula ("+1 Smith" -> "'+1 Smith", see
    services/exports.py); that ' is dropped here so re-uploading an export
    doesn't rename "+1 Smith" to "'+1 Smith". A ' before anything else
    ("'Ohana") is part of the name and kept."""
    value = (row.get(column) or "").strip()
    if value.startswith("'") and value[1:].startswith(FORMULA_PREFIXES):
        return value[1:].strip()
    return value


def _is_blank_row(row: dict) -> bool:
    """True for rows like ",,," that spreadsheets leave at the end of an
    export. A row with more cells than headers keeps the extras in a list."""
    for value in row.values():
        cells = value if isinstance(value, list) else [value]
        if any((cell or "").strip() for cell in cells):
            return False
    return True


def _parse_id(
    row: dict, column: str, line_number: int, errors: list[str]
) -> uuid.UUID | None:
    raw = (row.get(column) or "").strip()
    if not raw:
        return None
    try:
        return uuid.UUID(raw)
    except ValueError:
        errors.append(
            f'Row {line_number}: {column} "{raw}" isn\'t an ID this site '
            "created. Copy it unchanged from the export, or leave it blank."
        )
        return None


def _parse_plus_ones_allowed(
    row: dict, line_number: int, guest_name: str, errors: list[str]
) -> int | None:
    """How many guests the household may bring: a number, or yes/no for
    1/0. Blank = not given on this row."""
    raw = _cell(row, _PLUS_ONES_COLUMN)
    if not raw:
        return None
    lowered = raw.lower()
    if lowered in _PLUS_ONE_TRUE:
        return 1
    if lowered in _PLUS_ONE_FALSE:
        return 0
    # isascii: isdigit() alone also accepts characters like "²" that int()
    # can't read.
    if raw.isascii() and raw.isdigit() and int(raw) <= _MAX_PLUS_ONES:
        return int(raw)
    errors.append(
        f'Row {line_number} ({guest_name}): PlusOnesAllowed "{raw}" should be a '
        f"number from 0 to {_MAX_PLUS_ONES} (or yes/no), or blank for 0."
    )
    return None


def _parse_rows(
    text_data: str,
) -> tuple[list[_CleanedGuestRow], list[str], bool]:
    """Check every row before anything touches the database. Problems that
    would put bad data in (no guest name, an invalid email or ID) are
    collected from the whole file and raised together, so nothing is
    imported until the file is clean. Softer problems come back as
    warnings. Also returns whether the file has a PlusOnesAllowed column
    (older files don't, and then allowances are left as they are)."""
    reader = csv.DictReader(io.StringIO(text_data))
    if reader.fieldnames is None:
        raise ValidationError("The file is empty.")
    # Tolerate stray spaces around header names ("HouseholdName ").
    reader.fieldnames = [(name or "").strip() for name in reader.fieldnames]
    missing = [col for col in _REQUIRED_COLUMNS if col not in reader.fieldnames]
    if missing:
        raise ValidationError(
            f"The header row is missing column(s) {', '.join(missing)}. "
            f"Headers must be: {', '.join(_REQUIRED_COLUMNS)}."
        )
    has_plus_ones_column = _PLUS_ONES_COLUMN in reader.fieldnames

    cleaned_rows: list[_CleanedGuestRow] = []
    errors: list[str] = []
    warnings: list[str] = []
    for row in reader:
        # reader.line_num is the file line this row ended on, so it stays
        # right even when a quoted cell spans several lines.
        line_number = reader.line_num
        if _is_blank_row(row):
            continue

        guest_name = _cell(row, "GuestName")
        if not guest_name:
            errors.append(f"Row {line_number}: GuestName is required.")
            continue

        household_id = _parse_id(row, "HouseholdId", line_number, errors)
        guest_id = _parse_id(row, "GuestId", line_number, errors)
        if guest_id and not household_id and not (row.get("HouseholdId") or "").strip():
            errors.append(
                f"Row {line_number} ({guest_name}): has a GuestId but no "
                "HouseholdId. Keep both ID columns from the export together."
            )

        raw_email = _cell(row, "ContactEmail")
        contact_email: str | None = None
        if raw_email:
            try:
                contact_email = _EMAIL.validate_python(raw_email)
            except PydanticValidationError:
                errors.append(
                    f'Row {line_number} ({guest_name}): ContactEmail "{raw_email}" '
                    "isn't a valid email address. Use one address per cell, or "
                    "leave it blank."
                )
                continue

        raw_plus_one = (row["IsPlusOne"] or "").strip()
        if raw_plus_one.lower() in _PLUS_ONE_TRUE:
            is_plus_one = True
        elif raw_plus_one.lower() in _PLUS_ONE_FALSE:
            is_plus_one = False
        else:
            is_plus_one = False
            warnings.append(
                f'Row {line_number} ({guest_name}): IsPlusOne "{raw_plus_one}" '
                "isn't true or false, so they were imported as not a plus-one."
            )

        plus_ones_allowed = (
            _parse_plus_ones_allowed(row, line_number, guest_name, errors)
            if has_plus_ones_column
            else None
        )

        # A blank HouseholdName means this guest IS their own household
        # (unless the row has a HouseholdId, see household_name_given).
        given_household_name = _cell(row, "HouseholdName")
        household_name = given_household_name or guest_name
        cleaned_rows.append(
            _CleanedGuestRow(
                line_number=line_number,
                household_name=household_name,
                contact_email=contact_email,
                guest_name=guest_name,
                is_plus_one=is_plus_one,
                household_id=household_id,
                guest_id=guest_id,
                household_name_given=bool(given_household_name),
                plus_ones_allowed=plus_ones_allowed,
            )
        )

    if errors:
        raise ValidationError(
            "Nothing was imported. Fix these rows and upload again: " + " ".join(errors)
        )
    if not cleaned_rows:
        raise ValidationError("The file has a header row but no guests.")
    return cleaned_rows, warnings, has_plus_ones_column


class GuestListService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def list_households(
        self, limit: int = 50, offset: int = 0
    ) -> Page[HouseholdAdminView]:
        """Admin household list, alphabetical, with each guest's RSVP status
        -- backs the frontend's "guests" management table."""
        async with self.uow:
            households, total = await self.uow.household_repo.list_paginated(
                limit=limit, offset=offset
            )
            return Page(
                items=[HouseholdAdminView.model_validate(h) for h in households],
                total=total,
                limit=limit,
                offset=offset,
            )

    async def get_household(self, household_id: uuid.UUID) -> HouseholdAdminView:
        """Single household detail (guests + RSVP status), for a household
        detail/edit page."""
        async with self.uow:
            household = await self.uow.household_repo.get_by_id(household_id)
            if household is None:
                raise NotFoundError(f"Household {household_id} does not exist.")
            return HouseholdAdminView.model_validate(household)

    async def import_csv(self, file_bytes: bytes) -> GuestImportResponse:
        """
        Expects a CSV with headers:
        HouseholdName, ContactEmail, GuestName, IsPlusOne
        and optionally HouseholdId, GuestId (written by the export) and
        PlusOnesAllowed.

        Matching rows to what's already stored:
        - A row with a HouseholdId belongs to that household. If the row's
          HouseholdName differs, the household is renamed. Likewise a
          GuestId picks the guest, whose name and IsPlusOne are updated.
        - Otherwise households are matched by name (ignoring case) and
          guests by name within their household, as before. A household no
          row matches is created; one the file doesn't mention is left alone.
        - A blank HouseholdName means the guest is their own one-person
          household, named after themselves.

        Emails, per household:
        - Any row with a ContactEmail sets it for the household and all its
          guests (the last one wins if rows disagree, with a warning).
        - If every row for a household leaves ContactEmail blank, the
          household's saved email is removed, with a warning.

        PlusOnesAllowed, per household (only if the file has the column):
        how many guests it may bring, which the RSVP form offers. The last
        number given in its rows wins (warning if they disagree); all rows
        blank = 0. Lowering it never removes a guest someone already added.

        Rows are checked before anything is saved: a blank GuestName or an
        invalid email or ID anywhere stops the whole import, listing every
        such row. Fully blank rows are skipped. IsPlusOne accepts
        true/false, yes/no, y/n, 1/0 or blank (= false).
        """
        text_data = _decode_csv(file_bytes)
        cleaned_rows, warnings, has_plus_ones_column = _parse_rows(text_data)

        async with self.uow:
            plans = await self._plan(cleaned_rows, warnings)
            touched: dict[uuid.UUID, Household] = {}
            emails_removed: set[uuid.UUID] = set()
            for plan in plans:
                household = await self._apply(
                    plan, warnings, emails_removed, has_plus_ones_column
                )
                touched[household.id] = household

            # Every household created above was flushed by create(), and
            # renames/email changes live on the same in-memory objects the
            # query hands back, so this sees the post-import state.
            all_households = await self.uow.household_repo.list_all()
            warnings.extend(_database_warnings(touched, all_households, emails_removed))

            await self.uow.commit()

        message = "Guest list imported successfully."
        if warnings:
            message += f" {len(warnings)} thing(s) need attention -- see warnings."
        return GuestImportResponse(success=True, message=message, warnings=warnings)

    async def _plan(
        self, rows: list[_CleanedGuestRow], warnings: list[str]
    ) -> list[_HouseholdPlan]:
        """Group the rows by the household they belong to and check that
        every ID exists and no rename clashes with another name, all before
        anything is written."""
        errors: list[str] = []

        # 1. Group: by HouseholdId when given, otherwise by name.
        groups: dict[tuple[str, str], _HouseholdPlan] = {}
        for row in rows:
            group_key = (
                ("id", str(row.household_id))
                if row.household_id
                else ("name", row.household_name.lower())
            )
            groups.setdefault(group_key, _HouseholdPlan()).rows.append(row)

        # 2. Find each group's stored household.
        for (kind, _), plan in groups.items():
            id_rows = [r for r in plan.rows if r.household_id]
            if kind == "id":
                household_id = plan.rows[0].household_id
                assert household_id is not None
                plan.household = await self.uow.household_repo.get_by_id(household_id)
                if plan.household is None:
                    lines = ", ".join(str(r.line_number) for r in plan.rows)
                    errors.append(
                        f"Row(s) {lines}: HouseholdId {household_id} doesn't match any "
                        "household. Was it deleted, or copied from another site?"
                    )
                    continue
                named_rows = [r for r in id_rows if r.household_name_given]
                names = {r.household_name for r in named_rows}
                plan.name = (
                    named_rows[-1].household_name
                    if named_rows
                    else plan.household.display_name
                )
                plan.renamed_by_id = True
                if len({n.lower() for n in names}) > 1:
                    warnings.append(
                        f"Rows for household {_q(plan.household.display_name)} give "
                        f"different HouseholdNames ({', '.join(sorted(names))}); "
                        f"used the last one, {_q(plan.name)}."
                    )
            else:
                plan.name = plan.rows[0].household_name
                plan.household = await self.uow.household_repo.get_by_display_name(
                    plan.name
                )
                if plan.household is not None:
                    plan.name = plan.household.display_name
        if errors:
            raise ValidationError(
                "Nothing was imported. Fix these rows and upload again: "
                + " ".join(errors)
            )

        # 3. Merge groups that are the same household: rows without an ID
        # that use a household's old name (matched above to the same
        # stored household) or its new name (not stored yet).
        merged: dict[uuid.UUID | str, _HouseholdPlan] = {}
        for plan in groups.values():
            # Stored households by their id; new ones by name.
            merge_key: uuid.UUID | str = (
                plan.household.id if plan.household else plan.name.lower()
            )
            if merge_key in merged:
                _merge_into(merged[merge_key], plan)
            else:
                merged[merge_key] = plan
        new_name_plans = {
            key: plan for key, plan in merged.items() if plan.household is None
        }
        for new_key, plan in new_name_plans.items():
            target = next(
                (
                    p
                    for p in merged.values()
                    if p.renamed_by_id and p.name.lower() == plan.name.lower()
                ),
                None,
            )
            if target is not None:
                _merge_into(target, plan)
                del merged[new_key]

        # 4. A rename can't take a name another household has.
        final_names: dict[str, _HouseholdPlan] = {}
        for plan in merged.values():
            other = final_names.get(plan.name.lower())
            if other is not None:
                lines = ", ".join(
                    str(r.line_number)
                    for r in sorted(other.rows + plan.rows, key=lambda r: r.line_number)
                )
                errors.append(
                    f"Rows {lines}: two different households would both be named "
                    f"{_q(plan.name)}. Give one of them another name."
                )
                continue
            final_names[plan.name.lower()] = plan
            if plan.household and plan.name != plan.household.display_name:
                holder = await self.uow.household_repo.get_by_display_name(plan.name)
                if (
                    holder is not None
                    and holder.id != plan.household.id
                    and not any(
                        p.household and p.household.id == holder.id
                        for p in merged.values()
                    )
                ):
                    errors.append(
                        f"Can't rename {_q(plan.household.display_name)} to "
                        f"{_q(plan.name)}: another household already has that name."
                    )

        # 5. Each GuestId appears once and belongs to its household, and a
        # guest rename can't take the name of another guest in the same
        # household.
        for plan in merged.values():
            if plan.household is None:
                continue
            by_id = {g.id: g for g in plan.household.guests}
            renamed_to: dict[str, uuid.UUID] = {}
            first_row_for_id: dict[uuid.UUID, int] = {}
            for row in plan.rows:
                if row.guest_id is None:
                    continue
                # Usually a row copied to add a new guest without clearing
                # the GuestId. Applied as-is, the copy would rename the
                # original guest instead of adding someone.
                first = first_row_for_id.setdefault(row.guest_id, row.line_number)
                if first != row.line_number:
                    errors.append(
                        f"Rows {first} and {row.line_number} have the same GuestId. "
                        "If one of them is a new guest, clear its GuestId; if it's "
                        "the same guest twice, delete one of the rows."
                    )
                    continue
                earlier = renamed_to.setdefault(row.guest_name.lower(), row.guest_id)
                if earlier != row.guest_id:
                    errors.append(
                        f"Row {row.line_number}: two different guests in "
                        f"{_q(plan.household.display_name)} would both be named "
                        f"{_q(row.guest_name)}."
                    )
                    continue
                guest = by_id.get(row.guest_id)
                if guest is None:
                    errors.append(
                        f"Row {row.line_number} ({row.guest_name}): GuestId "
                        f"doesn't match any guest in {_q(plan.household.display_name)}."
                    )
                    continue
                clash = next(
                    (
                        g
                        for g in plan.household.guests
                        if g.id != guest.id
                        and g.full_name.strip().lower() == row.guest_name.lower()
                        and not any(r.guest_id == g.id for r in plan.rows)
                    ),
                    None,
                )
                if clash is not None:
                    errors.append(
                        f"Row {row.line_number}: can't rename {_q(guest.full_name)} "
                        f"to {_q(row.guest_name)}: someone in "
                        f"{_q(plan.household.display_name)} already has that name."
                    )
        if errors:
            raise ValidationError(
                "Nothing was imported. Fix these rows and upload again: "
                + " ".join(errors)
            )
        return list(merged.values())

    async def _apply(
        self,
        plan: _HouseholdPlan,
        warnings: list[str],
        emails_removed: set[uuid.UUID],
        has_plus_ones_column: bool,
    ) -> Household:
        """Write one household: create or rename it, settle its email and
        plus-one allowance, then update/add its guests."""
        email = _settle_email(plan, warnings)
        plus_ones_allowed = (
            _settle_plus_ones_allowed(plan, warnings) if has_plus_ones_column else None
        )

        household = plan.household
        if household is None:
            household = await self.uow.household_repo.create(
                display_name=plan.name,
                contact_email=email,
                invite_token=secrets.token_urlsafe(16),
            )
            existing_guests: list[Guest] = []
        else:
            # A brand new household (above) has never been loaded from a
            # query, and touching its .guests under the async ORM raises
            # MissingGreenlet -- so only stored households read .guests.
            existing_guests = list(household.guests)
            if plan.name != household.display_name:
                household.display_name = plan.name
            if (email or "").lower() != (household.contact_email or "").lower():
                if email is None:
                    emails_removed.add(household.id)
                    warnings.append(
                        f"Removed the saved email {household.contact_email} from "
                        f"{_q(household.display_name)}, since none of its rows has a "
                        "ContactEmail. It won't get any emails until one is added."
                    )
                # SQLAlchemy writes these as ordinary dirty-attribute
                # updates on commit. Every guest's .email mirrors the
                # household's.
                household.contact_email = email
                for guest in existing_guests:
                    guest.email = email

        # Rows with a GuestId first, so a guest renamed by ID claims its new
        # name before a plain row with that name could add a duplicate.
        rows = sorted(plan.rows, key=lambda r: r.guest_id is None)
        by_id = {g.id: g for g in existing_guests}
        seen_names: dict[str, int] = {}
        # Old name -> (row, new name) for guests renamed by GuestId, so a
        # leftover row still using the old name isn't added as a new guest.
        renamed_from: dict[str, tuple[int, str]] = {}
        for row in rows:
            name_key = row.guest_name.lower()
            if row.guest_id is not None:
                # _plan() already rejected unknown or repeated GuestIds.
                guest = by_id[row.guest_id]
                old_key = guest.full_name.strip().lower()
                if old_key != name_key:
                    renamed_from[old_key] = (row.line_number, row.guest_name)
                guest.full_name = row.guest_name
                guest.is_plus_one = row.is_plus_one
                seen_names[name_key] = row.line_number
                continue

            if name_key in seen_names:
                warnings.append(
                    f"Row {row.line_number} ({row.guest_name}): already listed in "
                    f"household {_q(plan.name)} on row {seen_names[name_key]}, so "
                    "this row was skipped. If they're two different people (e.g. "
                    'two plus-ones), give each a distinct name like "Guest of Ann".'
                )
                continue
            if name_key in renamed_from:
                line, new_name = renamed_from[name_key]
                warnings.append(
                    f"Row {row.line_number} ({row.guest_name}): skipped, because row "
                    f"{line} renames {_q(row.guest_name)} to {_q(new_name)}. If this "
                    "is a different person, give them a distinct name."
                )
                continue
            seen_names[name_key] = row.line_number
            if any(g.full_name.strip().lower() == name_key for g in existing_guests):
                continue
            await self.uow.guest_repo.create(
                household_id=household.id,
                full_name=row.guest_name,
                email=email,
                is_plus_one=row.is_plus_one,
            )

        if plus_ones_allowed is not None:
            _set_plus_ones_allowed(
                household, plus_ones_allowed, existing_guests, warnings
            )
        return household


def _merge_into(target: _HouseholdPlan, other: _HouseholdPlan) -> None:
    target.rows.extend(other.rows)
    target.rows.sort(key=lambda r: r.line_number)
    if other.renamed_by_id and not target.renamed_by_id:
        target.name = other.name
        target.renamed_by_id = True


def _settle_email(plan: _HouseholdPlan, warnings: list[str]) -> str | None:
    """The household's email after this import: the last ContactEmail
    given in its rows, or None if every row left it blank."""
    given = [(r.contact_email, r.line_number) for r in plan.rows if r.contact_email]
    if not given:
        return None
    distinct: dict[str, int] = {}
    for email, line in given:
        distinct.setdefault(email.lower(), line)
    if len(distinct) > 1:
        listed = ", ".join(f"{e} (row {line})" for e, line in distinct.items())
        warnings.append(
            f"Household {_q(plan.name)} has different ContactEmails: {listed}. "
            f"Used the last one, {given[-1][0]}, for everyone in it."
        )
    return given[-1][0]


def _settle_plus_ones_allowed(plan: _HouseholdPlan, warnings: list[str]) -> int:
    """The household's allowance after this import: the last number given
    in its rows, or 0 if every row left it blank."""
    given = [
        (r.plus_ones_allowed, r.line_number)
        for r in plan.rows
        if r.plus_ones_allowed is not None
    ]
    if not given:
        return 0
    if len({value for value, _ in given}) > 1:
        listed = ", ".join(f"{value} (row {line})" for value, line in given)
        warnings.append(
            f"Household {_q(plan.name)} has different PlusOnesAllowed values: "
            f"{listed}. Used the last one, {given[-1][0]}."
        )
    return given[-1][0]


def _set_plus_ones_allowed(
    household: Household,
    allowed: int,
    existing_guests: list[Guest],
    warnings: list[str],
) -> None:
    """Save the allowance. Lowering it below the number of guests the
    household already brought keeps those guests, with a warning."""
    before = household.plus_ones_allowed
    if allowed == before:
        return
    household.plus_ones_allowed = allowed
    brought = [g.full_name for g in existing_guests if g.is_plus_one]
    if before > 0 and len(brought) > allowed:
        warnings.append(
            f"Household {_q(household.display_name)} now allows {allowed} plus-one(s) "
            f"but already has {len(brought)} ({', '.join(brought)}). They stay on "
            "the guest list. "
            + (
                "The RSVP page now shows them like any invited guest, so the "
                "household can mark them as declining but not remove them."
                if allowed == 0
                else "The household can still edit or remove them on its RSVP "
                "page but can't add more."
            )
        )


def _database_warnings(
    touched: dict[uuid.UUID, Household],
    all_households: list[Household],
    emails_removed: set[uuid.UUID],
) -> list[str]:
    """Problems that depend on what's stored after the import: households
    with no email at all, and one inbox shared by several households."""
    warnings: list[str] = []
    for household in sorted(touched.values(), key=lambda h: h.display_name.lower()):
        if not household.contact_email and household.id not in emails_removed:
            warnings.append(
                f"Household {_q(household.display_name)} has no ContactEmail, so it "
                "won't get the invitation, reminders, or RSVP confirmation. Add "
                "an email and upload again, or send them their RSVP link yourself."
            )

    by_email: dict[str, list[Household]] = {}
    for household in all_households:
        if household.contact_email:
            by_email.setdefault(household.contact_email.lower(), []).append(household)
    for email, households in sorted(by_email.items()):
        if len(households) > 1 and any(h.id in touched for h in households):
            names = ", ".join(
                _q(h.display_name)
                for h in sorted(households, key=lambda h: h.display_name.lower())
            )
            warnings.append(
                f"{email} is the contact email for {len(households)} households "
                f"({names}), so that inbox gets a separate copy of every email "
                "for each one. That's expected for your own placeholder address; "
                "otherwise, if they're really one household, give their rows the "
                "same HouseholdName."
            )
    return warnings
