// Falls back to service-wed's own default port so `npm run dev` works
// out of the box without a .env.local -- override via VITE_API_BASE_URL
// if the backend runs elsewhere (see ui-wed/.env.example).
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
