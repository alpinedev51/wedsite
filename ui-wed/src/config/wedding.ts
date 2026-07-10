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
  coupleNames: import.meta.env.VITE_COUPLE_NAMES || "Mister & Missus",
  brideFirstName: import.meta.env.VITE_BRIDE_FNAME || "Missus",
  groomFirstName: import.meta.env.VITE_GROOM_FNAME || "Mister",
  date: new Date(import.meta.env.VITE_WEDDING_DATE || "2027-01-01T00:00:00"),
  location: {
    venue: import.meta.env.VITE_VENUE_NAME || "Pretty Venue",
    city: import.meta.env.VITE_VENUE_CITY || "Small Town, USA",
  },
  rsvpDeadline: new Date(
    import.meta.env.VITE_RSVP_DEADLINE || "2027-02-01T00:00:00",
  ),
};

export interface Milestone {
  date: string;
  title: string;
  description: string;
}

const defaultMilestones: Milestone[] = [
  {
    date: "Fall 2021",
    title: "How We Met",
    description: "In college",
  },
  {
    date: "Summer 2022",
    title: "First Date",
    description: "Went to dinner",
  },
];

function getMilestones(): Milestone[] {
  const rawData = import.meta.env.VITE_STORY_MILESTONES;
  let parsed = defaultMilestones;

  if (rawData) {
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      console.error(
        "Failed to parse VITE_STORY_MILESTONES JSON. Falling back to defaults.",
        e,
      );
    }
  }

  return parsed.map((m) => ({
    ...m,
    description: m.description
      .replace(/\{bride}/gi, wedding.brideFirstName)
      .replace(/\{groom}/gi, wedding.groomFirstName),
  }));
}

export const milestones = getMilestones();
