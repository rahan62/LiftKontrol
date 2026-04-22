/**
 * TS EN 81-20 ticket bands (green / blue / yellow / red) and final ticket outcome
 * after control-company revisit, based on which revision-scope articles are fulfilled.
 *
 * Green: all bands fulfilled.
 * Blue: not all green-band articles fulfilled, but blue, yellow, and red bands in scope are fulfilled.
 * Yellow: yellow + red fulfilled, blue band in scope not fully fulfilled (unsafe but usable).
 * Red: red band fulfilled but yellow band in scope not fully fulfilled (or worst fallback).
 */

export type TicketTier = "green" | "blue" | "yellow" | "red";
export type FinalTicket = TicketTier;

/** green (best) → red (worst) */
export const TICKET_RANK: Record<TicketTier, number> = {
  green: 4,
  blue: 3,
  yellow: 2,
  red: 1,
};

/** True if `actual` is strictly worse than what was agreed at contract (lower rank). */
export function isFinalTicketWorseThanAgreed(actual: TicketTier, agreed: TicketTier): boolean {
  return TICKET_RANK[actual] < TICKET_RANK[agreed];
}

/** True if every id in the list is in fulfilled (empty list → true). */
function subset(fulfilled: Set<string>, ids: string[]): boolean {
  return ids.every((id) => fulfilled.has(id));
}

/** True if at least one id in the list is not fulfilled (empty list → false). */
function notSubset(fulfilled: Set<string>, ids: string[]): boolean {
  return ids.some((id) => !fulfilled.has(id));
}

/**
 * @param fulfilledArticleIds - revision_article ids marked done at final inspection (catalog ids).
 * @param byTier - article ids from this revision, grouped by ticket_tier.
 */
export function computeFinalTicket(
  fulfilledArticleIds: Set<string>,
  byTier: Record<TicketTier, string[]>,
): FinalTicket | null {
  const G = byTier.green ?? [];
  const B = byTier.blue ?? [];
  const Y = byTier.yellow ?? [];
  const R = byTier.red ?? [];
  const total = G.length + B.length + Y.length + R.length;
  if (total === 0) return null;

  const g = subset(fulfilledArticleIds, G);
  const b = subset(fulfilledArticleIds, B);
  const y = subset(fulfilledArticleIds, Y);
  const r = subset(fulfilledArticleIds, R);

  if (g && b && y && r) return "green";
  if (!g && b && y && r) return "blue";
  if (y && r && !b) return "yellow";
  if (r && !y) return "red";
  return "red";
}
