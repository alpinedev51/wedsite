export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// <input type="datetime-local"> reads/writes local time with no timezone
// info, but the backend wants/returns UTC ISO strings. There's exactly one
// admin (one timezone) for this app, so "local time" unambiguously means
// the couple's own time zone -- no per-user timezone handling needed.
export function toDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalInput(value: string): string {
  return new Date(value).toISOString();
}
