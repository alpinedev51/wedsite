"""The CSV's PhysicalAddress column: a per-household mailing address the
couple keeps on the guest list. Uses test_guest_import.py's in-memory
stand-ins."""

import csv
import io

import pytest

from service_wed.domain.errors import ValidationError
from service_wed.services.exports import ExportService
from service_wed.services.guest_list import GuestListService
from test_guest_import import _household, _import

A_HEADER = "HouseholdName,ContactEmail,GuestName,PhysicalAddress,IsPlusOne\n"


@pytest.mark.asyncio
async def test_address_is_saved_per_household():
    uow, result = await _import(
        A_HEADER
        + 'The Lees,lees@example.com,Lu Lee,"12 Oak St\nDenver, CO 80202",\n'
        + 'The Lees,,Max Lee,"12 Oak St\nDenver, CO 80202",\n'
        + "Bea,bea@example.com,Bea,,\n"
    )
    assert _household(uow, "The Lees").physical_address == "12 Oak St\nDenver, CO 80202"
    assert _household(uow, "Bea").physical_address is None
    assert result.warnings == []


@pytest.mark.asyncio
async def test_address_is_tidied():
    uow, _ = await _import(
        A_HEADER + 'A,a@example.com,Ann,"  1 Main St  \r\n\r\n  Austin, TX  ",\n'
    )
    assert _household(uow, "A").physical_address == "1 Main St\nAustin, TX"


@pytest.mark.asyncio
async def test_address_only_on_one_row_is_used():
    uow, result = await _import(A_HEADER + "A,a@example.com,Ann,1 Main St,\nA,,Abe,,\n")
    assert _household(uow, "A").physical_address == "1 Main St"
    assert result.warnings == []


@pytest.mark.asyncio
async def test_new_household_rows_disagree_last_wins_with_warning():
    uow, result = await _import(
        A_HEADER + "A,a@example.com,Ann,1 Main St,\nA,,Abe,2 Elm St,\n"
    )
    assert _household(uow, "A").physical_address == "2 Elm St"
    assert any(
        "different PhysicalAddresses" in w and "the last one" in w
        for w in result.warnings
    )


@pytest.mark.asyncio
async def test_edit_in_one_row_wins_over_stale_rows():
    """The export repeats the address on every row of a household. An admin
    who edits only the first row shouldn't have the stale copy in the
    second row put the old address back."""
    uow, _ = await _import(
        A_HEADER + "A,a@example.com,Ann,1 Main St,\nA,,Abe,1 Main St,\n"
    )
    _, result = await _import(
        A_HEADER + "A,a@example.com,Ann,9 New Rd,\nA,,Abe,1 Main St,\n", uow
    )
    assert _household(uow, "A").physical_address == "9 New Rd"
    assert any(
        "differs from the saved address" in w and "row 2" in w for w in result.warnings
    )


@pytest.mark.asyncio
async def test_all_rows_blank_removes_address_with_warning():
    uow, _ = await _import(A_HEADER + "A,a@example.com,Ann,1 Main St,\n")
    _, result = await _import(A_HEADER + "A,a@example.com,Ann,,\n", uow)
    assert _household(uow, "A").physical_address is None
    assert any("Removed the saved PhysicalAddress" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_file_without_column_keeps_address():
    uow, _ = await _import(A_HEADER + "A,a@example.com,Ann,1 Main St,\n")
    _, result = await _import(
        "HouseholdName,ContactEmail,GuestName,IsPlusOne\nA,a@example.com,Ann,\n", uow
    )
    assert _household(uow, "A").physical_address == "1 Main St"
    assert result.warnings == []


@pytest.mark.asyncio
async def test_column_order_does_not_matter():
    uow, _ = await _import(
        "GuestName,IsPlusOne,PhysicalAddress,ContactEmail,HouseholdName\n"
        "Ann,,1 Main St,a@example.com,A\n"
    )
    assert _household(uow, "A").physical_address == "1 Main St"


@pytest.mark.asyncio
async def test_overlong_address_stops_the_import():
    uow = None
    with pytest.raises(ValidationError, match="PhysicalAddress is 501 characters"):
        uow, _ = await _import(A_HEADER + f"A,a@example.com,Ann,{'x' * 501},\n")
    assert uow is None


@pytest.mark.asyncio
async def test_export_puts_address_fourth_and_round_trips():
    uow, _ = await _import(
        A_HEADER
        + '"=Smiths",a@example.com,Ann,"1 Main St\nAustin, TX",\n'
        + '"=Smiths",,Abe,"1 Main St\nAustin, TX",true\n'
    )
    household = _household(uow, "=Smiths")
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
    header, *rows = list(csv.reader(io.StringIO(csv_text)))
    assert header[:5] == [
        "HouseholdName",
        "ContactEmail",
        "GuestName",
        "PhysicalAddress",
        "IsPlusOne",
    ]
    assert [r[3] for r in rows] == ["1 Main St\nAustin, TX"] * 2

    result = await GuestListService(uow).import_csv(csv_text.encode())
    assert result.warnings == []
    assert household.physical_address == "1 Main St\nAustin, TX"
    assert household.display_name == "=Smiths"
    assert len(uow.household_repo.rows) == 1
