// Single source of truth for wedding details used across components/pages.
// Each field falls back to the literal default below if its VITE_* env var
// isn't set -- see .env.example. These are Vite *build-time* values (baked
// into the JS bundle when `vite build` runs, since this ships as a static
// site with no server process to read env vars at request time) -- changing
// one means rebuilding, not just restarting the container. For a production
// docker build they're supplied via the root docker-compose.yml's
// `ui-wed.build.args` -- see ui-wed/Dockerfile.
//
// NOTE: service-wed (the backend) independently tracks its own wedding
// date/venue/RSVP deadline in its database, editable via the admin
// "Schedule" tab -- these VITE_* values are a *separate* copy with no live
// connection to that database. If the couple edits the date/venue there
// after deploying, these need updating (and a rebuild) to match, or the
// public pages will show stale info. Worth eventually replacing with a
// public endpoint that reads the same database row instead of keeping a
// second, build-time copy.
export const wedding = {
  coupleNames: import.meta.env.VITE_COUPLE_NAMES || "Austin & Kylie",
  date: new Date(import.meta.env.VITE_WEDDING_DATE || "2027-09-04T00:00:00"),
  location: {
    venue: import.meta.env.VITE_VENUE_NAME || "Behn Park",
    city: import.meta.env.VITE_VENUE_CITY || "Durango, CO",
  },
  rsvpDeadline: new Date(
    import.meta.env.VITE_RSVP_DEADLINE || "2027-07-24T00:00:00",
  ),
};
