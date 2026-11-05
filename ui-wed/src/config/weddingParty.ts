// The maid of honor and best man for the Wedding Party page. Build-time
// VITE_* values, like registry.ts (see wedding.ts for how they reach the
// build). A blank name leaves that card out.
//
// Their photos are src/assets/wedding-party/maid_of_honor.* and best_man.*
// (see the README there). Found with import.meta.glob rather than imported
// directly, so a missing photo isn't a build error -- the card shows the
// person's initial instead.

export interface PartyMember {
  id: "maidOfHonor" | "bestMan";
  role: string;
  name: string;
  photoSrc?: string;
}

// Each photo's URL by file name without its extension ("best_man"). With
// `import: "default"` these are just URL strings, and a photo downloads
// only when the page shows it -- except one under 4 KB, which Vite inlines
// into the code instead (no real photo is that small).
const photos: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(
      "../assets/wedding-party/*.{jpg,jpeg,png,webp,avif}",
      { eager: true, import: "default" },
    ),
  ).map(([path, url]) => [path.replace(/^.*\/|\.[^.]+$/g, ""), url]),
);

function member(
  id: PartyMember["id"],
  role: string,
  name: string | undefined,
  photo: string,
): PartyMember | null {
  const trimmed = name?.trim();
  return trimmed ? { id, role, name: trimmed, photoSrc: photos[photo] } : null;
}

export const weddingParty: PartyMember[] = [
  member(
    "maidOfHonor",
    "Maid of Honor",
    import.meta.env.VITE_MAID_OF_HONOR,
    "maid_of_honor",
  ),
  member("bestMan", "Best Man", import.meta.env.VITE_BEST_MAN, "best_man"),
].filter((m): m is PartyMember => m !== null);
