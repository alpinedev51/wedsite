import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../lib/api";
import { isValidDate } from "../lib/date";
import { getWeddingPublic } from "./wedding.api";
import { wedding as fallbackWedding, type WeddingConfig } from "./wedding";
import { WeddingConfigContext } from "./useWeddingConfig";

// A date the backend sent that won't parse keeps the fallback rather than
// replacing a good date with an Invalid one.
function liveDateOr(value: string, fallback: Date): Date {
  const parsed = new Date(value);
  if (isValidDate(parsed)) return parsed;
  // eslint-disable-next-line no-console -- the only signal a bad row gives.
  console.warn(`Unparseable date from /wedding: ${value}, using fallback.`);
  return fallback;
}

// Precedence: 1) service-wed's live `GET /wedding` row, 2) VITE_* build-time
// env vars, 3) hardcoded literals -- levels 2/3 both live in ./wedding.ts and
// are what this provider initializes from synchronously, so first paint
// never blocks on the network. If the fetch succeeds, its values overwrite
// the fallback; if it fails (backend unreachable, or a 404 because the
// couple hasn't saved a config yet) the fallback silently stays in effect --
// public pages must never show an error for this.
//
// Coordinates are the exception: they start out null and the build-time
// ones are only applied if the fetch fails. Blank coordinates in the admin
// Wedding tab mean "no map", so showing build-time ones first would draw a
// map that then vanishes.
const initialWedding: WeddingConfig = {
  ...fallbackWedding,
  location: { ...fallbackWedding.location, coordinates: null },
};

export function WeddingConfigProvider({ children }: { children: ReactNode }) {
  const [wedding, setWedding] = useState<WeddingConfig>(initialWedding);
  const [loaded, setLoaded] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getWeddingPublic()
      .then((data) => {
        if (cancelled) return;
        const rsvpOpensAt = data.rsvp_opens_at
          ? liveDateOr(data.rsvp_opens_at, new Date(0))
          : null;
        const brideFirstName =
          data.bride_first_name ?? fallbackWedding.brideFirstName;
        const groomFirstName =
          data.groom_first_name ?? fallbackWedding.groomFirstName;
        setWedding({
          coupleNames:
            data.bride_first_name && data.groom_first_name
              ? `${groomFirstName} & ${brideFirstName}`
              : fallbackWedding.coupleNames,
          brideFirstName,
          groomFirstName,
          namesConfigured: Boolean(
            (data.bride_first_name && data.groom_first_name) ||
            fallbackWedding.namesConfigured,
          ),
          date: liveDateOr(data.wedding_date, fallbackWedding.date),
          location: {
            venue: data.venue_name ?? fallbackWedding.location.venue,
            city: data.venue_city ?? fallbackWedding.location.city,
            // No build-time fallback here, unlike the fields above (see
            // initialWedding).
            coordinates:
              data.venue_latitude != null && data.venue_longitude != null
                ? {
                    latitude: data.venue_latitude,
                    longitude: data.venue_longitude,
                  }
                : null,
          },
          rsvpDeadline: liveDateOr(
            data.rsvp_deadline,
            fallbackWedding.rsvpDeadline,
          ),
          rsvpOpensAt,
        });
        setRsvpOpen(!rsvpOpensAt || Date.now() >= rsvpOpensAt.getTime());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // The one fallback value held back at startup (see initialWedding).
        setWedding((current) => ({
          ...current,
          location: {
            ...current.location,
            coordinates: fallbackWedding.location.coordinates,
          },
        }));
        // Not configured yet (404) is expected pre-launch, not an error --
        // anything else (network failure, 5xx) is worth a console note since
        // it's otherwise silent to whoever's debugging a stale-looking site.
        if (!(err instanceof ApiError && err.code === "not_found")) {
          // eslint-disable-next-line no-console -- see the comment above.
          console.warn(
            "Failed to fetch live wedding config, using fallback.",
            err,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WeddingConfigContext.Provider value={{ wedding, loaded, rsvpOpen }}>
      {children}
    </WeddingConfigContext.Provider>
  );
}
