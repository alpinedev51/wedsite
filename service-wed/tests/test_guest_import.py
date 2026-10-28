"""CSV guest-list import: row checks and warnings. Uses a small in-memory
stand-in for the household/guest repositories, like test_fixes_audit.py."""

import uuid
from types import SimpleNamespace

import pytest

from service_wed.domain.errors import ValidationError
from service_wed.services.guest_list import GuestListService

HEADER = "HouseholdName,ContactEmail,GuestName,IsPlusOne\n"
ID_HEADER = "HouseholdName,ContactEmail,GuestName,IsPlusOne,HouseholdId,GuestId\n"


class _Households:
    def __init__(self):
        self.rows = []

    async def get_by_display_name(self, name):
        return next(
            (h for h in self.rows if h.display_name.lower() == name.strip().lower()),
            None,
        )

    async def create(self, display_name, contact_email, invite_token):
        household = SimpleNamespace(
            id=uuid.uuid4(),
            display_name=display_name,
            contact_email=contact_email,
            invite_token=invite_token,
            plus_ones_allowed=0,
            guests=[],
        )
        self.rows.append(household)
        return household

    async def get_by_id(self, household_id):
        return next((h for h in self.rows if h.id == household_id), None)

    async def list_all(self):
        return list(self.rows)


class _Guests:
    def __init__(self, households):
        self.households = households

    async def create(self, household_id, full_name, email, is_plus_one):
        guest = SimpleNamespace(
            id=uuid.uuid4(), full_name=full_name, email=email, is_plus_one=is_plus_one
        )
        next(h for h in self.households.rows if h.id == household_id).guests.append(
            guest
        )
        return guest


class _Uow:
    def __init__(self):
        self.household_repo = _Households()
        self.guest_repo = _Guests(self.household_repo)
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return None

    async def commit(self):
        self.committed = True


async def _import(csv_text, uow=None):
    uow = uow or _Uow()
    result = await GuestListService(uow).import_csv(csv_text.encode())
    return uow, result


def _household(uow, name):
    return next(h for h in uow.household_repo.rows if h.display_name == name)


@pytest.mark.asyncio
async def test_blank_email_row_gets_household_email_in_either_order():
    uow, result = await _import(
        HEADER + "Smiths,,Ann,false\nSmiths,s@example.com,Bob,false\n"
    )
    smiths = _household(uow, "Smiths")
    assert smiths.contact_email == "s@example.com"
    assert [g.email for g in smiths.guests] == ["s@example.com"] * 2
    assert result.warnings == []


@pytest.mark.asyncio
async def test_invalid_emails_stop_the_import_and_list_every_bad_row():
    with pytest.raises(ValidationError) as err:
        await _import(
            HEADER
            + "A,n/a,Ann,false\nB,ok@example.com,Bob,false\nC,a@x.com; b@x.com,Cy,false\n"
        )
    assert "Row 2" in str(err.value) and "Row 4" in str(err.value)
    assert "Row 3" not in str(err.value)


@pytest.mark.asyncio
async def test_missing_guest_name_is_reported_with_other_errors():
    with pytest.raises(ValidationError) as err:
        await _import(HEADER + "A,,,false\nB,bad,Bob,false\n")
    assert "Row 2" in str(err.value) and "Row 3" in str(err.value)


@pytest.mark.asyncio
async def test_trailing_blank_rows_are_skipped():
    uow, result = await _import(HEADER + "A,a@example.com,Ann,false\n,,,\n , , , \n")
    assert len(uow.household_repo.rows) == 1
    assert result.warnings == []


@pytest.mark.asyncio
async def test_header_only_file_is_an_error():
    with pytest.raises(ValidationError, match="no guests"):
        await _import(HEADER)


@pytest.mark.asyncio
async def test_empty_file_is_an_error():
    with pytest.raises(ValidationError, match="empty"):
        await _import("")


@pytest.mark.asyncio
async def test_header_names_with_spaces_are_accepted():
    uow, _ = await _import(
        " HouseholdName , ContactEmail,GuestName ,IsPlusOne\nA,a@example.com,Ann,no\n"
    )
    assert _household(uow, "A").guests[0].full_name == "Ann"


@pytest.mark.asyncio
async def test_household_without_email_is_warned_even_with_a_name():
    _, result = await _import(HEADER + "Smiths,,Ann,false\nSmiths,,Bob,false\n")
    assert len(result.warnings) == 1
    assert '"Smiths" has no ContactEmail' in result.warnings[0]


@pytest.mark.asyncio
async def test_email_shared_by_two_households_is_warned():
    _, result = await _import(
        HEADER + ",fam@example.com,Ann,false\n,FAM@example.com,Bob,false\n"
    )
    assert len(result.warnings) == 1
    assert "2 households" in result.warnings[0]


@pytest.mark.asyncio
async def test_shared_email_with_a_household_from_an_earlier_upload_is_warned():
    uow, _ = await _import(HEADER + "Old,fam@example.com,Ann,false\n")
    _, result = await _import(HEADER + "New,fam@example.com,Bob,false\n", uow)
    assert any('"New", "Old"' in w for w in result.warnings)


@pytest.mark.asyncio
async def test_conflicting_emails_in_one_household_last_wins_with_warning():
    uow, result = await _import(
        HEADER + "Smiths,a@example.com,Ann,false\nSmiths,b@example.com,Bob,false\n"
    )
    smiths = _household(uow, "Smiths")
    assert smiths.contact_email == "b@example.com"
    assert [g.email for g in smiths.guests] == ["b@example.com"] * 2
    assert len(result.warnings) == 1
    assert "different ContactEmails" in result.warnings[0]


@pytest.mark.asyncio
async def test_same_guest_twice_in_a_household_is_warned_and_kept_once():
    uow, result = await _import(
        HEADER + "Smiths,s@example.com,Guest,true\nSmiths,,guest,true\n"
    )
    assert len(_household(uow, "Smiths").guests) == 1
    assert len(result.warnings) == 1
    assert "already listed" in result.warnings[0]


@pytest.mark.asyncio
async def test_plus_one_values():
    uow, result = await _import(
        HEADER
        + "A,a@example.com,T1,TRUE\nA,,T2,yes\nA,,T3,1\nA,,F1,\nA,,F2,No\nA,,X,maybe\n"
    )
    flags = {g.full_name: g.is_plus_one for g in _household(uow, "A").guests}
    assert flags == {
        "T1": True,
        "T2": True,
        "T3": True,
        "F1": False,
        "F2": False,
        "X": False,
    }
    assert len(result.warnings) == 1
    assert 'IsPlusOne "maybe"' in result.warnings[0]


@pytest.mark.asyncio
async def test_reupload_with_corrected_email_updates_without_warnings():
    uow, _ = await _import(HEADER + "Smiths,old@example.com,Ann,false\n")
    _, result = await _import(HEADER + "Smiths,new@example.com,Ann,false\n", uow)
    smiths = _household(uow, "Smiths")
    assert smiths.contact_email == "new@example.com"
    assert smiths.guests[0].email == "new@example.com"
    assert len(smiths.guests) == 1
    assert result.warnings == []


# --- re-uploading an edited export ------------------------------------------


async def _seeded():
    uow, _ = await _import(
        HEADER
        + "Smiths,s@example.com,Ann Smith,false\n"
        + "Smiths,,Bob Smith,false\n"
        + "Jones,j@example.com,Cy Jones,false\n"
    )
    return uow


def _ids(uow, household_name, guest_name):
    household = _household(uow, household_name)
    guest = next(g for g in household.guests if g.full_name == guest_name)
    return household.id, guest.id


@pytest.mark.asyncio
async def test_household_renamed_by_id_keeps_its_guests_and_token():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, bob = _ids(uow, "Smiths", "Bob Smith")
    token = _household(uow, "Smiths").invite_token
    _, result = await _import(
        ID_HEADER
        + f"Smith Family,s@example.com,Ann Smith,false,{hid},{ann}\n"
        + f"Smith Family,s@example.com,Bob Smith,false,{hid},{bob}\n",
        uow,
    )
    assert [h.display_name for h in uow.household_repo.rows] == [
        "Smith Family",
        "Jones",
    ]
    renamed = _household(uow, "Smith Family")
    assert renamed.invite_token == token
    assert [g.full_name for g in renamed.guests] == ["Ann Smith", "Bob Smith"]
    assert result.warnings == []


@pytest.mark.asyncio
async def test_new_row_without_id_joins_a_renamed_household_by_old_or_new_name():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    await _import(
        ID_HEADER
        + f"Smith Family,s@example.com,Ann Smith,false,{hid},{ann}\n"
        + "Smith Family,,Dee Smith,true,,\n"
        + "Smiths,,Eve Smith,false,,\n",
        uow,
    )
    assert len(uow.household_repo.rows) == 2
    names = [g.full_name for g in _household(uow, "Smith Family").guests]
    assert names == ["Ann Smith", "Bob Smith", "Dee Smith", "Eve Smith"]


@pytest.mark.asyncio
async def test_guest_renamed_by_id_and_plus_one_updated():
    uow = await _seeded()
    hid, bob = _ids(uow, "Smiths", "Bob Smith")
    _, result = await _import(
        ID_HEADER + f"Smiths,s@example.com,Robert Smith,true,{hid},{bob}\n", uow
    )
    guests = {g.full_name: g.is_plus_one for g in _household(uow, "Smiths").guests}
    assert guests == {"Ann Smith": False, "Robert Smith": True}
    assert result.warnings == []


@pytest.mark.asyncio
async def test_rename_onto_another_households_name_is_an_error():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    with pytest.raises(ValidationError, match="another household already has"):
        await _import(
            ID_HEADER + f"jones,s@example.com,Ann Smith,false,{hid},{ann}\n", uow
        )
    assert _household(uow, "Smiths")


@pytest.mark.asyncio
async def test_guest_rename_onto_another_guests_name_is_an_error():
    uow = await _seeded()
    hid, bob = _ids(uow, "Smiths", "Bob Smith")
    with pytest.raises(ValidationError, match="already has that name"):
        await _import(
            ID_HEADER + f"Smiths,s@example.com,Ann Smith,false,{hid},{bob}\n", uow
        )


@pytest.mark.asyncio
async def test_unknown_or_malformed_ids_are_errors():
    uow = await _seeded()
    hid, _ = _ids(uow, "Smiths", "Ann Smith")
    with pytest.raises(ValidationError) as err:
        await _import(
            ID_HEADER
            + f"Smiths,,Ann Smith,false,{uuid.uuid4()},\n"
            + "Smiths,,Ann Smith,false,not-an-id,\n"
            + f"Smiths,,Ann Smith,false,,{uuid.uuid4()}\n",
            uow,
        )
    assert all(f"Row {n}" in str(err.value) for n in (3, 4))
    with pytest.raises(ValidationError, match="doesn't match any guest"):
        await _import(
            ID_HEADER + f"Smiths,,Ann Smith,false,{hid},{uuid.uuid4()}\n", uow
        )
    with pytest.raises(ValidationError, match="doesn't match any household"):
        await _import(ID_HEADER + f"Smiths,,Ann Smith,false,{uuid.uuid4()},\n", uow)


@pytest.mark.asyncio
async def test_swapping_two_households_names_works():
    uow = await _seeded()
    smiths, ann = _ids(uow, "Smiths", "Ann Smith")
    jones, cy = _ids(uow, "Jones", "Cy Jones")
    await _import(
        ID_HEADER
        + f"Jones,s@example.com,Ann Smith,false,{smiths},{ann}\n"
        + f"Smiths,j@example.com,Cy Jones,false,{jones},{cy}\n",
        uow,
    )
    assert _household(uow, "Jones").id == smiths


@pytest.mark.asyncio
async def test_export_round_trip_changes_nothing():
    uow = await _seeded()
    rows = [
        f"{h.display_name},{h.contact_email or ''},{g.full_name},"
        f"{'true' if g.is_plus_one else 'false'},{h.id},{g.id}"
        for h in uow.household_repo.rows
        for g in h.guests
    ]
    before = [
        (h.display_name, h.contact_email, [(g.full_name, g.email) for g in h.guests])
        for h in uow.household_repo.rows
    ]
    _, result = await _import(ID_HEADER + "\n".join(rows) + "\n", uow)
    after = [
        (h.display_name, h.contact_email, [(g.full_name, g.email) for g in h.guests])
        for h in uow.household_repo.rows
    ]
    assert before == after
    assert result.warnings == []


# --- removing an email --------------------------------------------------------


@pytest.mark.asyncio
async def test_all_blank_emails_remove_the_saved_email():
    uow = await _seeded()
    _, result = await _import(
        HEADER + "Smiths,,Ann Smith,false\nSmiths,,Bob Smith,false\n", uow
    )
    smiths = _household(uow, "Smiths")
    assert smiths.contact_email is None
    assert all(g.email is None for g in smiths.guests)
    assert len(result.warnings) == 1
    assert "Removed the saved email s@example.com" in result.warnings[0]
    assert _household(uow, "Jones").contact_email == "j@example.com"


@pytest.mark.asyncio
async def test_one_email_in_any_row_keeps_it():
    uow = await _seeded()
    _, result = await _import(
        HEADER + "Smiths,,Ann Smith,false\nSmiths,s@example.com,Bob Smith,false\n",
        uow,
    )
    assert _household(uow, "Smiths").contact_email == "s@example.com"
    assert result.warnings == []


@pytest.mark.asyncio
async def test_placeholder_email_shared_by_households_is_one_warning():
    _, result = await _import(
        HEADER
        + "Aunt May,us@example.com,May,false\n"
        + "Uncle Ben,us@example.com,Ben,false\n"
        + "Grandpa,us@example.com,Joe,false\n"
    )
    assert len(result.warnings) == 1
    assert "3 households" in result.warnings[0]


# --- copied rows and the export's formula guard -----------------------------


@pytest.mark.parametrize("copy_first", [True, False])
@pytest.mark.asyncio
async def test_copied_row_with_same_guest_id_is_an_error(copy_first):
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    original = f"Smiths,s@example.com,Ann Smith,false,{hid},{ann}\n"
    copy = f"Smiths,s@example.com,Dee Smith,true,{hid},{ann}\n"
    rows = copy + original if copy_first else original + copy
    with pytest.raises(ValidationError, match="Rows 2 and 3 have the same GuestId"):
        await _import(ID_HEADER + rows, uow)
    names = [g.full_name for g in _household(uow, "Smiths").guests]
    assert names == ["Ann Smith", "Bob Smith"]


@pytest.mark.asyncio
async def test_copied_row_with_guest_id_cleared_adds_the_guest():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, result = await _import(
        ID_HEADER
        + f"Smiths,s@example.com,Dee Smith,true,{hid},\n"
        + f"Smiths,s@example.com,Ann Smith,false,{hid},{ann}\n",
        uow,
    )
    names = [g.full_name for g in _household(uow, "Smiths").guests]
    assert names == ["Ann Smith", "Bob Smith", "Dee Smith"]
    assert result.warnings == []


@pytest.mark.asyncio
async def test_export_formula_guard_is_stripped_on_reupload():
    uow, _ = await _import(HEADER + "+1 Smith,p@example.com,-Ann,false\n")
    household = _household(uow, "+1 Smith")
    guest = household.guests[0]
    _, result = await _import(
        ID_HEADER + f"'+1 Smith,p@example.com,'-Ann,false,{household.id},{guest.id}\n",
        uow,
    )
    assert household.display_name == "+1 Smith"
    assert guest.full_name == "-Ann"
    assert len(uow.household_repo.rows) == 1
    assert result.warnings == []


@pytest.mark.asyncio
async def test_apostrophe_that_is_part_of_a_name_is_kept():
    uow, _ = await _import(HEADER + "'Ohana,o@example.com,Kai,false\n")
    assert _household(uow, "'Ohana")


# --- review round: blank names with IDs, stale rows, more edge cases --------


@pytest.mark.asyncio
async def test_blank_household_name_with_id_keeps_the_name():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, bob = _ids(uow, "Smiths", "Bob Smith")
    _, result = await _import(
        ID_HEADER
        + f",s@example.com,Ann Smith,false,{hid},{ann}\n"
        + f",s@example.com,Bob Smith,false,{hid},{bob}\n",
        uow,
    )
    assert _household(uow, "Smiths").id == hid
    assert result.warnings == []


@pytest.mark.asyncio
async def test_blank_household_name_with_id_next_to_a_rename_uses_the_rename():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, bob = _ids(uow, "Smiths", "Bob Smith")
    _, result = await _import(
        ID_HEADER
        + f",s@example.com,Ann Smith,false,{hid},{ann}\n"
        + f"Smith Family,s@example.com,Bob Smith,false,{hid},{bob}\n",
        uow,
    )
    assert _household(uow, "Smith Family").id == hid
    assert result.warnings == []


@pytest.mark.asyncio
async def test_blank_household_name_without_id_is_still_its_own_household():
    uow = await _seeded()
    await _import(HEADER + ",solo@example.com,Sam Solo,false\n", uow)
    assert _household(uow, "Sam Solo").contact_email == "solo@example.com"


@pytest.mark.asyncio
async def test_leftover_row_with_a_renamed_guests_old_name_is_skipped():
    uow = await _seeded()
    hid, bob = _ids(uow, "Smiths", "Bob Smith")
    _, result = await _import(
        ID_HEADER
        + "Smiths,s@example.com,Bob Smith,false,,\n"
        + f"Smiths,s@example.com,Robert Smith,false,{hid},{bob}\n",
        uow,
    )
    names = [g.full_name for g in _household(uow, "Smiths").guests]
    assert names == ["Ann Smith", "Robert Smith"]
    assert len(result.warnings) == 1
    assert "row 3 renames" in result.warnings[0]


@pytest.mark.asyncio
async def test_case_only_rename_of_household_and_guest():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, result = await _import(
        ID_HEADER + f"SMITHS,s@example.com,ann smith,false,{hid},{ann}\n", uow
    )
    household = _household(uow, "SMITHS")
    assert [g.full_name for g in household.guests][0] == "ann smith"
    assert len(household.guests) == 2
    assert result.warnings == []


@pytest.mark.asyncio
async def test_swapping_two_guests_names_works():
    uow = await _seeded()
    hid, ann = _ids(uow, "Smiths", "Ann Smith")
    _, bob = _ids(uow, "Smiths", "Bob Smith")
    await _import(
        ID_HEADER
        + f"Smiths,s@example.com,Bob Smith,false,{hid},{ann}\n"
        + f"Smiths,s@example.com,Ann Smith,false,{hid},{bob}\n",
        uow,
    )
    guests = {g.id: g.full_name for g in _household(uow, "Smiths").guests}
    assert guests == {ann: "Bob Smith", bob: "Ann Smith"}


@pytest.mark.asyncio
async def test_two_households_renamed_to_the_same_name_is_an_error():
    uow = await _seeded()
    smiths, ann = _ids(uow, "Smiths", "Ann Smith")
    jones, cy = _ids(uow, "Jones", "Cy Jones")
    with pytest.raises(ValidationError, match="Rows 2, 3: two different households"):
        await _import(
            ID_HEADER
            + f"Family,s@example.com,Ann Smith,false,{smiths},{ann}\n"
            + f"family,j@example.com,Cy Jones,false,{jones},{cy}\n",
            uow,
        )
    assert {h.display_name for h in uow.household_repo.rows} == {"Smiths", "Jones"}


@pytest.mark.asyncio
async def test_guest_id_from_another_household_is_an_error():
    uow = await _seeded()
    smiths, _ = _ids(uow, "Smiths", "Ann Smith")
    _, cy = _ids(uow, "Jones", "Cy Jones")
    with pytest.raises(ValidationError, match="doesn't match any guest"):
        await _import(ID_HEADER + f"Smiths,,Cy Jones,false,{smiths},{cy}\n", uow)


@pytest.mark.asyncio
async def test_guest_id_without_household_id_is_an_error():
    uow = await _seeded()
    _, ann = _ids(uow, "Smiths", "Ann Smith")
    with pytest.raises(ValidationError, match="GuestId but no HouseholdId"):
        await _import(ID_HEADER + f"Smiths,,Ann Smith,false,,{ann}\n", uow)


@pytest.mark.asyncio
async def test_email_starting_with_a_formula_character_round_trips():
    uow, _ = await _import(HEADER + "Plus,+tag@example.com,Pat,false\n")
    household = _household(uow, "Plus")
    guest = household.guests[0]
    await _import(
        ID_HEADER + f"Plus,'+tag@example.com,Pat,false,{household.id},{guest.id}\n",
        uow,
    )
    assert household.contact_email == "+tag@example.com"


@pytest.mark.asyncio
async def test_windows_line_endings_quotes_and_multiline_cells():
    text = (
        "HouseholdName,ContactEmail,GuestName,IsPlusOne\r\n"
        '"Smith, Jr. Family",a@example.com,"Ann ""Annie"" Smith",false\r\n'
        '"The\nOdd One",b@example.com,Odd,false\r\n'
        ',,"",\r\n'
    )
    uow, result = await _import(text)
    assert (
        _household(uow, "Smith, Jr. Family").guests[0].full_name == 'Ann "Annie" Smith'
    )
    assert _household(uow, "The\nOdd One")
    assert result.warnings == []


@pytest.mark.asyncio
async def test_error_row_numbers_count_multiline_cells():
    text = HEADER + '"Two\nLines",a@example.com,Ann,false\nX,bad,Bob,false\n'
    with pytest.raises(ValidationError, match="Row 4 \\(Bob\\)"):
        await _import(text)


@pytest.mark.asyncio
async def test_columns_in_any_order_and_extra_columns():
    uow, _ = await _import(
        "Notes,IsPlusOne,GuestName,ContactEmail,HouseholdName\n"
        "vegan,true,Ann,a@example.com,Smiths\n"
    )
    guest = _household(uow, "Smiths").guests[0]
    assert guest.is_plus_one is True and guest.email == "a@example.com"


@pytest.mark.asyncio
async def test_row_with_extra_cells_is_imported():
    uow, _ = await _import(HEADER + "Smiths,a@example.com,Ann,false,stray,cells\n")
    assert _household(uow, "Smiths").guests[0].full_name == "Ann"


@pytest.mark.asyncio
async def test_short_row_missing_trailing_cells():
    uow, _ = await _import(HEADER + "Smiths,a@example.com,Ann\n")
    assert _household(uow, "Smiths").guests[0].is_plus_one is False


@pytest.mark.asyncio
async def test_missing_required_column_is_an_error():
    with pytest.raises(ValidationError, match="missing column\\(s\\) IsPlusOne"):
        await _import("HouseholdName,ContactEmail,GuestName\nA,a@example.com,Ann\n")


@pytest.mark.asyncio
async def test_failed_import_never_commits():
    uow = _Uow()
    with pytest.raises(ValidationError):
        await _import(HEADER + "A,bad,Ann,false\n", uow)
    assert uow.committed is False and uow.household_repo.rows == []
