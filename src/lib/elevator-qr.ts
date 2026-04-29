/**
 * URL encoded in elevator QR codes. Prefers NEXT_PUBLIC_APP_URL, then NEXT_PUBLIC_SITE_URL,
 * so phone cameras open the correct origin; otherwise returns a path (same-origin scans only).
 */
export function canonicalElevatorUrl(assetId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const root = appUrl || siteUrl;
  /** Public path: opens kamu yardım sayfası (tarayıcı); iOS QR tarama yine UUID çıkarır ve uygulama içi detaya gider. */
  const path = `/go/${assetId}`;
  if (!root) return path;
  return `${root}${path}`;
}

const ASSET_PATH_RE =
  /(?:\/app\/assets\/|\/go\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Parse asset id from a scanned QR string (full URL or path). Safe on client and server. */
export function parseElevatorAssetIdFromScan(raw: string): string | null {
  const m = raw.trim().match(ASSET_PATH_RE);
  return m ? m[1].toLowerCase() : null;
}

const UUID_STRICT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate `[assetId]` route segment from `/go/[assetId]`. */
export function parseAssetUuidParam(segment: string): string | null {
  const s = segment.trim().toLowerCase();
  return UUID_STRICT.test(s) ? s : null;
}
