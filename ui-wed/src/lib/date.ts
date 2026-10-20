// The wedding happens in one place, so every guest should see the same date
// and time for it no matter where they're browsing from.
//
// Why this is needed: the backend stores wedding_date as a UTC instant, and
// the raw Date getters (getDate(), toLocaleDateString(), ...) resolve against
// the *viewer's* timezone. An admin in Durango saving midnight on Sept 4
// stores 2027-09-04T06:00:00Z; a guest reading that in Hawaii would see
// getDate() === 3 and the site would tell them the wrong day. Pinning every
// display to the venue's zone fixes that for all viewers at once.
//
// Hardcoded on purpose -- there is exactly one wedding in one place. To reuse
// this for a wedding elsewhere, change this one string to that venue's IANA
// timezone (e.g. "America/New_York", "Europe/Paris").
export const WEDDING_TIME_ZONE = "America/Denver";

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: WEDDING_TIME_ZONE,
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: WEDDING_TIME_ZONE,
  });
}

/** e.g. "4:30 PM" -- venue-local, same reasoning as the date formatters. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: WEDDING_TIME_ZONE,
  });
}

/** e.g. "10/20/2026, 3:00 PM MDT" -- for admin tables, venue-local like the
 * admin date inputs, with the zone shown so nobody reads it as their own. */
export function formatVenueDateTime(date: Date): string {
  if (!isValidDate(date)) return "";
  return (
    date.toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: WEDDING_TIME_ZONE,
    }) + ` ${venueZoneName(date)}`
  );
}

function venueZoneName(date: Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: WEDDING_TIME_ZONE,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

/** False for an Invalid Date (e.g. a malformed VITE_* value). The Intl-based
 * helpers below throw a RangeError on one, so they check this first and
 * degrade instead of taking the whole page down. */
export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

// One formatter for every venue-timezone lookup. Building an
// Intl.DateTimeFormat is expensive, and the Countdown calls into this every
// tick, so it's created once at module load.
const venuePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEDDING_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

/** The venue's wall-clock reading at `date`. `month` is 1-12 here. Caller
 * must pass a valid date (formatToParts throws on an Invalid Date). */
function readVenueClock(date: Date) {
  const parts = venuePartsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // hour12:false can yield "24" for midnight in some engines.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/** The ceremony time ("4:30 PM"), or null while the stored date still sits
 * at midnight. A date seeded from an env var or a bare date picker lands on
 * 00:00, which means "time not decided yet" -- printing "12:00 AM" would be
 * worse than saying nothing. Also null for an invalid date. */
export function ceremonyTime(date: Date): string | null {
  if (!isValidDate(date)) return null;
  const { hour, minute } = readVenueClock(date);
  return hour !== 0 || minute !== 0 ? formatTime(date) : null;
}

/** Calendar parts resolved in the venue's timezone. MiniCalendar needs these
 * rather than getFullYear()/getMonth()/getDate(), which would circle the wrong
 * square for any guest west of the venue. `month` is 0-indexed to match the
 * Date API that callers are used to. Returns null for an Invalid Date. */
export function getWeddingDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!isValidDate(date)) return null;
  const { year, month, day } = readVenueClock(date);
  // Intl gives 1-12; callers expect the Date API's 0-11.
  return { year, month: month - 1, day };
}

/** True when both instants fall on the same calendar day at the venue. */
export function isSameVenueDay(a: Date, b: Date): boolean {
  if (!isValidDate(a) || !isValidDate(b)) return false;
  const pa = readVenueClock(a);
  const pb = readVenueClock(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** How far the venue's clock is from UTC at a given instant, in ms. */
function venueOffsetMs(date: Date): number {
  const c = readVenueClock(date);
  const asIfUtc = Date.UTC(
    c.year,
    c.month - 1,
    c.day,
    c.hour,
    c.minute,
    c.second,
  );
  // Drop sub-second precision so the offset is a whole number of seconds.
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Turns a bare wall-clock string ("2027-09-04T00:00:00", no offset) into the
 * instant at which the *venue's* clock reads that time. A time that occurs
 * twice (fall-back) resolves to the first, daylight-time occurrence.
 *
 * Needed because `new Date("2027-09-04T00:00:00")` resolves against whatever
 * timezone the viewer's browser is in, so the same build of the site would
 * disagree with itself about the wedding date and time from city to city.
 * Used for the VITE_* / hardcoded fallback values in config/wedding.ts; the
 * live backend sends proper UTC instants and needs none of this. */
export function civilToInstant(civil: string): Date {
  const value = civil.trim();
  // Already a real instant ("...Z" or "...-06:00") -- respect it as given
  // rather than reinterpreting it as venue wall-clock time.
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) return new Date(value);
  // Date-only ("2027-09-04") means midnight at the venue. Spelled out because
  // "2027-09-04Z" isn't a format every browser parses.
  const wallClock = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const naive = new Date(`${wallClock}Z`);
  if (Number.isNaN(naive.getTime())) return new Date(value);
  // The offset has to be read at the real instant, not at `naive` (6-7 hours
  // away), or a time just after a DST change comes out an hour off. First
  // pass gets close; the second reads the offset there.
  const firstGuess = new Date(naive.getTime() - venueOffsetMs(naive));
  const corrected = new Date(naive.getTime() - venueOffsetMs(firstGuess));
  // A time skipped by spring-forward (2:30 AM) never shows on the venue's
  // clock; keep the first guess there, which matches Python's zoneinfo, so
  // ui-wed and service-wed (config/venue.py) agree on every input.
  return readsAsWallClock(corrected, naive) ? corrected : firstGuess;
}

/** True when the venue's clock at `instant` shows the wall time in `naive`
 * (a Date whose UTC fields hold that wall time). */
function readsAsWallClock(instant: Date, naive: Date): boolean {
  return (
    instant.getTime() + venueOffsetMs(instant) ===
    Math.floor(naive.getTime() / 1000) * 1000
  );
}

// <input type="datetime-local"> holds a wall-clock time with no timezone,
// and the backend wants/returns UTC ISO strings. Both helpers use the
// venue's clock, not the admin's browser, so the admin form means the same
// thing as the .env dates (Durango time) wherever the admin is browsing from.

/** UTC ISO string -> "YYYY-MM-DDTHH:MM" in venue time, with ":SS" added
 * when the seconds aren't zero (so re-saving a 23:59:59 deadline keeps it).
 * Inputs showing a value with seconds need step={1}, or the browser rejects
 * it as off-step. Empty string for an unparseable value. */
export function toDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!isValidDate(d)) return "";
  const c = readVenueClock(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${c.year}-${pad(c.month)}-${pad(c.day)}T${pad(c.hour)}:${pad(c.minute)}`;
  return c.second ? `${base}:${pad(c.second)}` : base;
}

/** datetime-local value (venue wall-clock time) -> UTC ISO string. */
export function fromDatetimeLocalInput(value: string): string {
  return civilToInstant(value).toISOString();
}
