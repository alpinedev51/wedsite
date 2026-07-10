import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../lib/api";
import { getWeddingPublic } from "./wedding.api";
import { wedding as fallbackWedding, type WeddingConfig } from "./wedding";

interface WeddingConfigContextValue {
  wedding: WeddingConfig;
}

const WeddingConfigContext = createContext<WeddingConfigContextValue | null>(
  null,
);

// Precedence: 1) service-wed's live `GET /wedding` row, 2) VITE_* build-time
// env vars, 3) hardcoded literals -- levels 2/3 both live in ./wedding.ts and
// are what this provider initializes from synchronously, so first paint
// never blocks on the network. If the fetch succeeds, its values overwrite
// the fallback; if it fails (backend unreachable, or a 404 because the
// couple hasn't saved a config yet) the fallback silently stays in effect --
// public pages must never show an error for this.
export function WeddingConfigProvider({ children }: { children: ReactNode }) {
  const [wedding, setWedding] = useState<WeddingConfig>(fallbackWedding);

  useEffect(() => {
    let cancelled = false;
    getWeddingPublic()
      .then((data) => {
        if (cancelled) return;
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
          date: new Date(data.wedding_date),
          location: {
            venue: data.venue_name ?? fallbackWedding.location.venue,
            city: data.venue_city ?? fallbackWedding.location.city,
          },
          rsvpDeadline: new Date(data.rsvp_deadline),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Not configured yet (404) is expected pre-launch, not an error --
        // anything else (network failure, 5xx) is worth a console note since
        // it's otherwise silent to whoever's debugging a stale-looking site.
        if (!(err instanceof ApiError && err.code === "not_found")) {
          console.warn(
            "Failed to fetch live wedding config, using fallback.",
            err,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WeddingConfigContext.Provider value={{ wedding }}>
      {children}
    </WeddingConfigContext.Provider>
  );
}

export function useWeddingConfig(): WeddingConfigContextValue {
  const ctx = useContext(WeddingConfigContext);
  if (!ctx) {
    throw new Error(
      "useWeddingConfig must be used within a WeddingConfigProvider",
    );
  }
  return ctx;
}
