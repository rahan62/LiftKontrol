/** Inclusive ISO calendar dates (`yyyy-MM-dd`) for dashboard filters (UTC calendar arithmetic). */

const DAY_MS = 86400000;
const MAX_SPAN_DAYS = 731;

export function formatISODateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First day of the UTC month containing `d`. */
export function utcStartOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Last calendar day of the UTC month containing `d` (date at UTC midnight). */
export function utcEndOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

export function defaultDashboardRangeUTC(now = new Date()): { from: string; to: string } {
  const start = utcStartOfMonth(now);
  const end = utcEndOfMonth(now);
  return { from: formatISODateUTC(start), to: formatISODateUTC(end) };
}

function parseISO(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * Validates `from` / `to` query strings; returns clamped inclusive range.
 */
export function resolveDashboardRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: string; to: string } {
  const fallback = defaultDashboardRangeUTC();
  const fromD = fromRaw ? parseISO(fromRaw) : null;
  const toD = toRaw ? parseISO(toRaw) : null;
  if (!fromD || !toD) return fallback;
  let from = fromD.getTime() <= toD.getTime() ? fromD : toD;
  let to = fromD.getTime() <= toD.getTime() ? toD : fromD;
  const span = Math.floor((to.getTime() - from.getTime()) / DAY_MS);
  if (span > MAX_SPAN_DAYS) {
    to = new Date(from.getTime() + MAX_SPAN_DAYS * DAY_MS);
  }
  return { from: formatISODateUTC(from), to: formatISODateUTC(to) };
}
