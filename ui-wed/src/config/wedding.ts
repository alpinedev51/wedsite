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
import { civilToInstant, isValidDate } from "../lib/date";

// A malformed VITE_* date would otherwise become an Invalid Date and show
// "NaN" in every countdown slot. Falls back to the placeholder instead, with
// a console note so whoever built the site can see why.
function buildTimeDate(value: string | undefined, placeholder: string): Date {
  const parsed = civilToInstant(value || placeholder);
  if (isValidDate(parsed)) return parsed;
  // eslint-disable-next-line no-console -- the only signal a bad build gives.
  console.warn(`Unparseable build-time date "${value}", using ${placeholder}.`);
  return civilToInstant(placeholder);
}

export const wedding = {
  coupleNames: import.meta.env.VITE_COUPLE_NAMES || "Mister & Missus",
  brideFirstName: import.meta.env.VITE_BRIDE_FNAME || "Missus",
  groomFirstName: import.meta.env.VITE_GROOM_FNAME || "Mister",
  // False while the names above are the "Mister"/"Missus" placeholders, so
  // the Monogram can stay blank instead of flashing "M & M".
  namesConfigured: Boolean(
    import.meta.env.VITE_BRIDE_FNAME && import.meta.env.VITE_GROOM_FNAME,
  ),
  // civilToInstant (inside buildTimeDate), not `new Date(...)`: these
  // strings usually carry no timezone, so a plain Date would resolve them
  // against each viewer's own timezone and the site would report a different
  // wedding date in Honolulu than in Denver. Read as wall-clock time at the
  // venue instead -- see lib/date.ts.
  date: buildTimeDate(import.meta.env.VITE_WEDDING_DATE, "2027-01-01"),
  location: {
    venue: import.meta.env.VITE_VENUE_NAME || "Pretty Venue",
    city: import.meta.env.VITE_VENUE_CITY || "Small Town, USA",
  },
  rsvpDeadline: buildTimeDate(
    import.meta.env.VITE_RSVP_DEADLINE,
    "2027-02-01T23:59:59",
  ),
  // When RSVPs open (admin Wedding tab). Live value only -- no build-time
  // fallback: null means "open", and the backend enforces it either way.
  rsvpOpensAt: null as Date | null,
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
