// Empty string = same-origin, relative API calls (`/api/v1/...`). That's
// the right default for both places this ships:
//  - Behind Traefik (root docker-compose.yml): one origin serves both the
//    SPA and the API via PathPrefix routing, so relative calls just work
//    and there's no CORS to configure at all.
//  - `npm run dev`: vite.config.ts already proxies `/api` to
//    localhost:8000, so relative calls work here too with zero setup.
// Local dev's .env.local overrides this with an absolute cross-origin URL
// instead (see ui-wed/README or .env.example) -- that's a deliberate,
// separate choice to exercise the real cross-origin/cookie path service-wed
// documents, not something this default needs to account for.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";
