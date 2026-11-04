// Registry links for the Registry page. Build-time VITE_* values, like the
// fallbacks in wedding.ts (see that file for how they reach the build).
// Blank means the card still shows, with "link coming soon" instead of a link.

// A link pasted without "https://" (www.theknot.com/...) would otherwise be
// treated as a page on this site and land on Not Found, so it's added to
// anything not already starting with http:// or https://. Whatever still
// isn't a valid address is dropped with a console note, and that card shows
// "link coming soon".
function registryUrl(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  const isHttp = /^https?:\/\//i.test(raw);
  // Some other kind of address (ftp://...) isn't a registry page; adding
  // https:// to it would only make a broken link.
  const otherScheme = !isHttp && /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (!otherScheme) {
    try {
      const url = new URL(isHttp ? raw : `https://${raw}`);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.href;
      }
    } catch {
      // Falls through to the warning below.
    }
  }
  // eslint-disable-next-line no-console -- the only signal a bad build gives.
  console.warn(`Unusable registry link "${raw}", hiding it.`);
  return "";
}

export const registry = {
  knotUrl: registryUrl(import.meta.env.VITE_REGISTRY_KNOT_URL),
  etsyUrl: registryUrl(import.meta.env.VITE_REGISTRY_ETSY_URL),
};
