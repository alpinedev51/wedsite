import { API_BASE_URL } from "../config/env";

// service-wed returns two distinct error shapes -- business-rule errors as
// {"error": {"code", "message"}}, and FastAPI/Pydantic validation or auth
// failures as {"detail": ...} (string, or a list of {msg} objects). This
// normalizes both into a single `message` (and `code`, when present).
function extractErrorInfo(body: unknown): { code?: string; message: string } {
  if (body && typeof body === "object") {
    if ("error" in body) {
      const err = (body as { error?: { code?: string; message?: string } })
        .error;
      if (err)
        return { code: err.code, message: err.message ?? "Request failed." };
    }
    if ("detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return { message: detail };
      if (Array.isArray(detail)) {
        const messages = detail
          .map((d) =>
            d && typeof d === "object" && "msg" in d ? String(d.msg) : null,
          )
          .filter((msg): msg is string => msg !== null);
        if (messages.length > 0) return { message: messages.join(", ") };
      }
    }
  }
  return { message: "Request failed." };
}

export class ApiError extends Error {
  status: number; // HTTP status -- callers branch on this (e.g. 401 -> redirect to login)
  code?: string; // stable, switch-on-able error code from the {error:{code,message}} shape
  body: unknown; // the raw parsed response body, for anything callers need beyond message/code

  constructor(status: number, body: unknown) {
    const { code, message } = extractErrorInfo(body);
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/** JSON request/response helper. Always sends the admin session cookie
 * cross-origin -- see README's "Integrating with a ... frontend" section. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // For CSV uploads `init.body` is a FormData -- the browser must set its
  // own multipart Content-Type (with the boundary token), so we must NOT
  // set one ourselves or the backend can't parse the multipart body.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: isFormData
      ? init?.headers
      : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** For endpoints that return a raw file (CSV export) rather than JSON --
 * `apiFetch` always calls `res.json()`, which would throw on a CSV body,
 * so exports need this separate `res.blob()` path instead. */
export async function apiDownload(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  return res.blob();
}

/** Shared by every admin page's catch block -- an ApiError's `message` is
 * already display-ready (see extractErrorInfo above); anything else (a
 * network failure, a thrown non-ApiError) falls back to a generic string. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong.";
}
