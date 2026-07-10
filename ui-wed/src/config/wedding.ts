// Fallback wedding details -- levels 2 (VITE_* build-time env var) and 3
// (hardcoded literal) of the config precedence chain. Level 1 is
// service-wed's live `GET /wedding` DB row, fetched at runtime by
// WeddingConfigContext (see src/context/WeddingConfigContext.tsx), which
// initializes from this module synchronously (so first paint never blocks
// on the network) and overwrites these values once the fetch resolves.
// This module's own values only remain in effect if that fetch fails
// (backend unreachable) or hasn't resolved yet -- everywhere in the app
// should read wedding config via useWeddingConfig(), not by importing
// `wedding` directly, so it benefits from the live backend data.
//
// These VITE_* vars are Vite *build-time* values (baked into the JS bundle
// when `vite build` runs) -- supplied via the root docker-compose.yml's
// `ui-wed.build.args`, see ui-wed/Dockerfile. Changing one means rebuilding,
// not just restarting the container -- that's fine for a fallback layer that
// should rarely need to change once set.
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

export type WeddingConfig = typeof wedding;

export interface Milestone {
  date: string;
  title: string;
  description: string;
}

// This couple's real Our Story content lives in ./milestones.json, which is
// gitignored (personal, not for the public repo -- see ui-wed/.gitignore).
// Copy milestones.example.json (committed, generic placeholder, same shape)
// to milestones.json and fill in the real story -- same .example/real
// pattern as .env.example/.env elsewhere in this repo. import.meta.glob
// (not a static import) is what makes milestones.json optional -- it
// matches whatever's actually on disk at build time instead of erroring on
// a missing path, so a fresh clone without that file still builds fine.
import genericMilestones from "./milestones.example.json";

const overrideMilestoneFiles = import.meta.glob<{ default: Milestone[] }>(
  "./milestones.json",
  { eager: true },
);

function getMilestones(): Milestone[] {
  const override = Object.values(overrideMilestoneFiles)[0]?.default;
  const parsed = override ?? (genericMilestones as Milestone[]);

  return parsed.map((m) => ({
    ...m,
    description: m.description
      .replace(/\{bride}/gi, wedding.brideFirstName)
      .replace(/\{groom}/gi, wedding.groomFirstName),
  }));
}

export const milestones = getMilestones();
