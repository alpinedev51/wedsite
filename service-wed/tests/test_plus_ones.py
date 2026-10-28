"""Plus-ones: the RSVP form adding, editing and removing guests a household
brings, and the CSV's PlusOnesAllowed column. In-memory stand-ins for the
repositories, like test_guest_import.py."""

import uuid
from types import SimpleNamespace

import pytest
from pydantic import ValidationError as PydanticValidationError

from service_wed.domain.errors import ValidationError
from service_wed.domain.value_objects import RsvpStatus
from service_wed.schemas.rsvp import HouseholdRsvpSubmitRequest
from service_wed.services.exports import ExportService
from service_wed.services.guest_list import GuestListService
from service_wed.services.rsvp import RsvpService

from test_guest_import import _Uow as _ImportUow, _household, _import

TOKEN = "tok"


def _guest(name, is_plus_one=False, status=None, meal=None, notes=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        full_name=name,
        email="ann@example.com",
        is_plus_one=is_plus_one,
        rsvp_status=status,
        meal_choice=meal,
        dietary_notes=notes,
    )


class _Store:
    """One household, its guests, and what the service wrote."""

    def __init__(self, allowed=1, guests=None):
        self.household = SimpleNamespace(
            id=uuid.uuid4(),
            display_name="Ann Smith",
            contact_email="ann@example.com",
            invite_token=TOKEN,
            plus_ones_allowed=allowed,
            guests=guests if guests is not None else [_guest("Ann Smith")],
            message_to_couple=None,
            song_request=None,
            rsvp_submitted_at=None,
            rsvp_updated_at=None,
        )
        self.deleted = []
        self.emails = []
        self.committed = False

    def guest(self, name):
        return next(g for g in self.household.guests if g.full_name == name)


class _Uow:
    def __init__(self, store):
        self.store = store
        household = store.household

        async def get_by_invite_token(token):
            return household if token == TOKEN else None

        async def get_wedding():
            return None

        async def upsert_response(guest_id, status, meal_choice, dietary_notes):
            guest = next(g for g in household.guests if g.id == guest_id)
            guest.rsvp_status = status
            guest.meal_choice = meal_choice
            guest.dietary_notes = dietary_notes

        async def create(household_id, full_name, email, is_plus_one):
            assert household_id == household.id
            guest = _guest(full_name, is_plus_one=is_plus_one)
            guest.email = email
            household.guests.append(guest)
            return guest

        async def delete(guest):
            store.deleted.append(guest.full_name)

        async def create_batch(messages):
            store.emails.extend(messages)

        self.household_repo = SimpleNamespace(get_by_invite_token=get_by_invite_token)
        self.wedding_repo = SimpleNamespace(get=get_wedding)
        self.rsvp_repo = SimpleNamespace(upsert_response=upsert_response)
        self.guest_repo = SimpleNamespace(create=create, delete=delete)
        self.email_message_repo = SimpleNamespace(create_batch=create_batch)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return None

    async def commit(self):
        self.store.committed = True


def _request(responses, plus_ones=None):
    payload = {"responses": responses}
    if plus_ones is not None:
        payload["plus_ones"] = plus_ones
    return HouseholdRsvpSubmitRequest.model_validate(payload)


def _attending(guest):
    return {"guest_id": str(guest.id), "status": "attending"}


async def _submit(store, responses, plus_ones=None):
    return await RsvpService(_Uow(store)).submit_rsvp(
        TOKEN, _request(responses, plus_ones)
    )


# --- RSVP form ------------------------------------------------------------


@pytest.mark.asyncio
async def test_bringing_a_guest_adds_them_to_the_household_as_attending():
    store = _Store()
    ann = store.guest("Ann Smith")
    await _submit(
        store,
        [_attending(ann)],
        [{"full_name": "  Aibe Jones ", "dietary_notes": "vegetarian"}],
    )
    aibe = store.guest("Aibe Jones")
    assert aibe.is_plus_one
    assert aibe.email == "ann@example.com"
    assert aibe.rsvp_status == RsvpStatus.ATTENDING
    assert aibe.dietary_notes == "vegetarian"
    assert store.committed
    assert len(store.emails) == 1  # one confirmation, to Ann


@pytest.mark.asyncio
async def test_editing_a_plus_one_by_id_fixes_name_and_details_in_place():
    store = _Store()
    ann = store.guest("Ann Smith")
    await _submit(
        store, [_attending(ann)], [{"full_name": "Aibe", "dietary_notes": "veg"}]
    )
    aibe = store.guest("Aibe")
    await _submit(
        store,
        [_attending(ann)],
        [{"guest_id": str(aibe.id), "full_name": "Abe", "dietary_notes": None}],
    )
    assert aibe.full_name == "Abe"
    assert aibe.dietary_notes is None
    assert len(store.household.guests) == 2
    assert store.deleted == []


@pytest.mark.asyncio
async def test_resubmitting_a_new_plus_one_by_name_does_not_duplicate_them():
    """A page that wasn't reloaded sends the plus-one again with no ID."""
    store = _Store()
    ann = store.guest("Ann Smith")
    await _submit(store, [_attending(ann)], [{"full_name": "Abe"}])
    abe = store.guest("Abe")
    await _submit(store, [_attending(ann)], [{"full_name": "abe", "meal_choice": "x"}])
    assert [g.full_name for g in store.household.guests] == ["Ann Smith", "abe"]
    assert store.guest("abe") is abe
    assert abe.meal_choice == "x"


@pytest.mark.asyncio
async def test_empty_list_removes_the_plus_one_and_none_leaves_them():
    store = _Store()
    ann = store.guest("Ann Smith")
    await _submit(store, [_attending(ann)], [{"full_name": "Abe"}])

    await _submit(store, [_attending(ann)])  # plus_ones left out
    assert store.deleted == []
    assert "Abe" in [g.full_name for g in store.household.guests]

    await _submit(store, [_attending(ann)], [])
    assert store.deleted == ["Abe"]
    assert [g.full_name for g in store.household.guests] == ["Ann Smith"]


@pytest.mark.asyncio
async def test_more_plus_ones_than_allowed_is_rejected_and_nothing_saved():
    store = _Store(allowed=1)
    ann = store.guest("Ann Smith")
    with pytest.raises(ValidationError, match="includes 1 guest"):
        await _submit(
            store, [_attending(ann)], [{"full_name": "Abe"}, {"full_name": "Bo"}]
        )
    assert not store.committed
    assert ann.rsvp_status is None  # Ann's own answer wasn't saved either


@pytest.mark.asyncio
async def test_no_plus_ones_allowed_is_rejected():
    store = _Store(allowed=0)
    ann = store.guest("Ann Smith")
    with pytest.raises(ValidationError, match="doesn't include bringing"):
        await _submit(store, [_attending(ann)], [{"full_name": "Abe"}])


@pytest.mark.asyncio
async def test_plus_one_needs_someone_attending():
    store = _Store()
    ann = store.guest("Ann Smith")
    with pytest.raises(ValidationError, match="someone on the invitation"):
        await _submit(
            store,
            [{"guest_id": str(ann.id), "status": "declined"}],
            [{"full_name": "Abe"}],
        )


@pytest.mark.asyncio
async def test_attending_from_an_earlier_submit_counts():
    store = _Store()
    ann = store.guest("Ann Smith")
    ann.rsvp_status = RsvpStatus.ATTENDING
    await _submit(store, [], [{"full_name": "Abe"}])
    assert store.guest("Abe").is_plus_one


@pytest.mark.asyncio
async def test_plus_one_cannot_be_sent_as_an_invited_guest():
    """A plus-one has no allowance of their own: they can't answer as an
    invited guest, so they can't be used to bring someone else."""
    abe = _guest("Abe", is_plus_one=True, status=RsvpStatus.ATTENDING)
    store = _Store(guests=[_guest("Ann Smith"), abe])
    with pytest.raises(ValidationError, match="guest you're bringing"):
        await _submit(store, [_attending(abe)])


@pytest.mark.asyncio
async def test_invited_guest_cannot_be_edited_or_removed_as_a_plus_one():
    store = _Store()
    ann = store.guest("Ann Smith")
    with pytest.raises(ValidationError, match="isn't a guest this household"):
        await _submit(
            store,
            [_attending(ann)],
            [{"guest_id": str(ann.id), "full_name": "Someone Else"}],
        )
    # Removing every plus-one never touches invited guests.
    await _submit(store, [_attending(ann)], [])
    assert store.deleted == []


@pytest.mark.asyncio
async def test_plus_one_named_like_an_invited_guest_or_twice_is_rejected():
    store = _Store(allowed=2)
    ann = store.guest("Ann Smith")
    with pytest.raises(ValidationError, match="already on this invitation"):
        await _submit(store, [_attending(ann)], [{"full_name": "ann smith"}])
    with pytest.raises(ValidationError, match="listed twice"):
        await _submit(
            store, [_attending(ann)], [{"full_name": "Abe"}, {"full_name": "ABE"}]
        )


def test_blank_plus_one_name_is_rejected_by_the_request_schema():
    with pytest.raises(PydanticValidationError):
        _request([], [{"full_name": "   "}])


@pytest.mark.asyncio
async def test_lowered_allowance_keeps_existing_plus_ones_editable():
    abe = _guest("Abe", is_plus_one=True, status=RsvpStatus.ATTENDING)
    bo = _guest("Bo", is_plus_one=True, status=RsvpStatus.ATTENDING)
    store = _Store(allowed=1, guests=[_guest("Ann Smith"), abe, bo])
    ann = store.guest("Ann Smith")
    await _submit(
        store,
        [_attending(ann)],
        [
            {"guest_id": str(abe.id), "full_name": "Abe"},
            {"guest_id": str(bo.id), "full_name": "Bo B"},
        ],
    )
    assert bo.full_name == "Bo B"
    # Swapping one of them for someone new isn't allowed while over.
    with pytest.raises(ValidationError, match="includes 1 guest"):
        await _submit(
            store,
            [_attending(ann)],
            [{"guest_id": str(abe.id), "full_name": "Abe"}, {"full_name": "Cy"}],
        )
    # Removing one gets back within the allowance.
    await _submit(
        store, [_attending(ann)], [{"guest_id": str(abe.id), "full_name": "Abe"}]
    )
    assert store.deleted == ["Bo B"]


@pytest.mark.asyncio
async def test_listed_plus_one_without_allowance_is_answered_like_anyone():
    """The older approach: the couple lists "Guest of Ann" with IsPlusOne
    and no allowance. Ann answers for them as a normal guest."""
    placeholder = _guest("Guest of Ann", is_plus_one=True)
    store = _Store(allowed=0, guests=[_guest("Ann Smith"), placeholder])
    ann = store.guest("Ann Smith")
    await _submit(
        store,
        [_attending(ann), {"guest_id": str(placeholder.id), "status": "declined"}],
    )
    assert placeholder.rsvp_status == RsvpStatus.DECLINED


# --- CSV ------------------------------------------------------------------

P_HEADER = "HouseholdName,ContactEmail,GuestName,IsPlusOne,PlusOnesAllowed\n"


@pytest.mark.asyncio
async def test_plus_ones_allowed_values():
    uow, result = await _import(
        P_HEADER
        + "A,a@example.com,Ann,,1\n"
        + "B,b@example.com,Bea,,yes\n"
        + "C,c@example.com,Cy,,2\n"
        + "D,d@example.com,Di,,\n"
        + "E,e@example.com,Ed,,no\n"
    )
    allowed = {h.display_name: h.plus_ones_allowed for h in uow.household_repo.rows}
    assert allowed == {"A": 1, "B": 1, "C": 2, "D": 0, "E": 0}
    assert not any("PlusOnesAllowed" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_bad_plus_ones_allowed_stops_the_import():
    for bad in ("maybe", "-1", "11", "1.5", "²"):
        uow = _ImportUow()
        with pytest.raises(ValidationError, match=f'PlusOnesAllowed "{bad}"'):
            await _import(P_HEADER + f"A,a@example.com,Ann,,{bad}\n", uow)
        assert uow.household_repo.rows == []


@pytest.mark.asyncio
async def test_plus_ones_allowed_last_value_wins_with_warning():
    uow, result = await _import(
        P_HEADER + "A,a@example.com,Ann,,1\nA,,Bob,,\nA,,Cat,,2\n"
    )
    assert _household(uow, "A").plus_ones_allowed == 2
    assert any("different PlusOnesAllowed" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_file_without_the_column_leaves_allowance_alone():
    uow, _ = await _import(P_HEADER + "A,a@example.com,Ann,,1\n")
    await _import(
        "HouseholdName,ContactEmail,GuestName,IsPlusOne\nA,a@example.com,Ann,\n", uow
    )
    assert _household(uow, "A").plus_ones_allowed == 1
    # With the column present but blank on every row, it goes back to 0.
    await _import(P_HEADER + "A,a@example.com,Ann,,\n", uow)
    assert _household(uow, "A").plus_ones_allowed == 0


@pytest.mark.asyncio
async def test_lowering_below_existing_plus_ones_warns_and_keeps_them():
    uow, _ = await _import(P_HEADER + "A,a@example.com,Ann,,1\nA,,Abe,true,1\n")
    _, result = await _import(P_HEADER + "A,a@example.com,Ann,,0\n", uow)
    household = _household(uow, "A")
    assert household.plus_ones_allowed == 0
    assert [g.full_name for g in household.guests] == ["Ann", "Abe"]
    assert any(
        "already has 1 (Abe)" in w and "mark them as declining" in w
        for w in result.warnings
    )


@pytest.mark.asyncio
async def test_export_includes_plus_ones_allowed_and_round_trips():
    uow, _ = await _import(P_HEADER + "A,a@example.com,Ann,,1\nA,,Abe,true,\n")
    household = _household(uow, "A")
    for guest in household.guests:
        guest.rsvp_status = None
        guest.meal_choice = None
        guest.dietary_notes = None
    household.song_request = None
    household.message_to_couple = None

    async def list_all_with_guests():
        return [household]

    uow.household_repo.list_all_with_guests = list_all_with_guests
    csv_text = await ExportService(uow).export_guests_csv()
    header, ann_row, abe_row = csv_text.strip().splitlines()
    assert header.split(",")[4] == "PlusOnesAllowed"
    assert ann_row.split(",")[4] == "1"
    assert abe_row.split(",")[3:5] == ["true", "1"]

    result = await GuestListService(uow).import_csv(csv_text.encode())
    assert result.warnings == []
    assert household.plus_ones_allowed == 1
    assert [g.full_name for g in household.guests] == ["Ann", "Abe"]
