# ui-wed

The wedding website's frontend: the public site (home, our story, wedding
party, things to do, travel, photos, registry), magic-link RSVPs, and the
admin area. React 19 + TypeScript + Vite + Tailwind CSS v4.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

It needs the API running (see the [root README](../README.md#option-1-development-fast-reload)).
With `VITE_API_BASE_URL` unset, calls go to `/api/...` on the same origin, and
Vite proxies them to `http://localhost:8000` (`vite.config.ts`). To call the
API cross-origin instead, copy `.env.example` to `.env.local`. The backend then
needs `DEBUG=true` for the admin cookie (see the backend README's
[cookie note](../service-wed/README.md#cookie-based-auth)).

| Script                            | Does                                                |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | dev server with hot reload                          |
| `npm run build`                   | type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview`                 | serve the built `dist/`                             |
| `npm run lint`                    | ESLint                                              |
| `npm run format` / `format:check` | Prettier                                            |

## Routes

| Path                                                                                    | Page                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/`, `/our-story`, `/wedding-party`, `/things-to-do`, `/travel`, `/photos`, `/registry` | public pages                                                       |
| `/rsvp/:token`                                                                          | RSVP form for a household (the token is the magic link)            |
| `/find-invitation`                                                                      | lost-link recovery by name + email (`/rsvp` redirects here)        |
| `/admin/login`                                                                          | admin sign-in                                                      |
| `/admin/admin_dashboard`                                                                | Dashboard, Guests (CSV import/export), Campaigns, Wedding settings |

All API calls go through `src/lib/api.ts` (`credentials: "include"`, one
error type for both backend error shapes).

## Configuration

Wedding details come from **two places**:

1. **Live, from the API:** `GET /api/v1/wedding` (`src/config/wedding.api.ts`,
   `WeddingConfigContext`). This is the source of truth; edit the values in the
   admin Wedding tab.
2. **Built in, as fallback:** `VITE_COUPLE_NAMES`, `VITE_BRIDE_FNAME`,
   `VITE_GROOM_FNAME`, `VITE_WEDDING_DATE`, `VITE_VENUE_NAME`,
   `VITE_VENUE_CITY`, `VITE_RSVP_DEADLINE`. These are shown until the API
   answers, or if it can't, and fill the page `<title>` and meta tags. Unset
   ones use the placeholders in `src/config/wedding.ts`.
   - Locally: `.env.local`.
   - Docker builds: build args from the root `.env`.
   - CI: GitHub repository variables (see [deploy/README.md](../deploy/README.md#what-goes-where)).

Other configuration:

- **Our Story timeline:** `src/config/milestones.json` (gitignored, so it stays
  out of the public repo). Copy `milestones.example.json` and fill it in.
  Without it, the example is used. In CI it comes from the `MILESTONES_JSON`
  repository variable.
- **Dates and times** are shown in the venue's time zone (`WEDDING_TIME_ZONE`
  in `src/lib/date.ts`, America/Denver). This must match
  `service-wed/src/service_wed/config/venue.py`.
- **Photos** live in `src/assets/`, compressed for the web (keep new ones to a
  few hundred KB). Importing them from there lets Vite fingerprint them for
  long-term caching.

## Production image

`Dockerfile` has two stages:

1. `node:24` runs `npm ci` and `npm run build`.
2. **`nginx-unprivileged`** serves the build as a non-root user on port
   **8080** (`nginx.conf`):
   - unknown paths fall back to `index.html`, for client-side routing;
   - `/assets/*` is cached for a year (immutable), and `index.html` is
     `no-cache`, so a deploy shows up straight away;
   - `/healthz` answers the container health check.

Security headers and the Content-Security-Policy are added by Traefik
(`../traefik/dynamic.yml`), not nginx. Loading anything from a new outside
domain (fonts, scripts, images) needs an update there too.

## Design notes

**Palette:** `#F5F1E8` · `#33302A` · `#6E5A45` · `#97A586` · `#8AA0B4` · `#C8A24C`

**Type** (Google Fonts, as CSS variables in `src/index.css`): Pinyon Script
(`--font-script`), Fraunces (`--font-display`), EB Garamond (`--font-body`),
Jost (`--font-utility`). The feel is classic, with modern touches.

**Signature:** a hand-drawn eucalyptus sprig (SVG line art) framing the hero
corners. The decor components are in `src/components/decor/`.
