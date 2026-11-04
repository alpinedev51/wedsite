import { createContext, useContext } from "react";
import type { WeddingConfig } from "./wedding";

// The context lives here, apart from WeddingConfigProvider, so that file
// exports only a component (which React's hot reload needs).
export interface WeddingConfigContextValue {
  wedding: WeddingConfig;
  // True once GET /wedding has answered or failed. Pages that must not show
  // fallback values first (the RSVP gate) wait for this.
  loaded: boolean;
  // False before wedding.rsvpOpensAt. Worked out once, when the config
  // arrives (a guest won't sit on the page across the opening moment).
  rsvpOpen: boolean;
}

export const WeddingConfigContext =
  createContext<WeddingConfigContextValue | null>(null);

export function useWeddingConfig(): WeddingConfigContextValue {
  const ctx = useContext(WeddingConfigContext);
  if (!ctx) {
    throw new Error(
      "useWeddingConfig must be used within a WeddingConfigProvider",
    );
  }
  return ctx;
}
