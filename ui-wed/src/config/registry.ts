// Registry links for the Registry page. Build-time VITE_* values, like the
// fallbacks in wedding.ts (see that file for how they reach the build).
// Blank means the card still shows, with "link coming soon" instead of a link.
export const registry = {
  knotUrl: import.meta.env.VITE_REGISTRY_KNOT_URL || "",
  etsyUrl: import.meta.env.VITE_REGISTRY_ETSY_URL || "",
};
