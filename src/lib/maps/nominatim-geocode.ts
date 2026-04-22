/**
 * OpenStreetMap Nominatim (ücretsiz, kota: ~1 istek/sn; üretimde kendi önbelleğinizi kullanın).
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const UA = "ElevatorMaintenance/0.1 (fleet routing; contact: support@local)";

export type GeocodeHit = { lat: number; lng: number; displayName?: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function trimStr(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function parseServiceAddr(addr: unknown): {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
} | null {
  if (!addr || typeof addr !== "object") return null;
  const a = addr as Record<string, unknown>;
  return {
    line1: trimStr(a.line1),
    line2: trimStr(a.line2),
    city: trimStr(a.city),
    region: trimStr(a.region),
    postal_code: trimStr(a.postal_code),
    country: trimStr(a.country),
  };
}

/** Boş ülke = varsayılan TR (çoğu saha TR); serbest metin aramada countrycodes ile sınırlandırma kritik. */
export function inferCountryCodesForNominatim(addr: unknown): string | null {
  const p = parseServiceAddr(addr);
  if (!p) return null;
  const c = p.country.toLowerCase();
  if (!c) return "tr";
  if (c === "tr" || c.includes("türkiye") || c.includes("turkey")) return "tr";
  if (c.length === 2) return c;
  return null;
}

async function nominatimGet(params: URLSearchParams): Promise<GeocodeHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const row = data[0];
  if (!row?.lat || !row?.lon) return null;
  const lat = Number.parseFloat(row.lat);
  const lng = Number.parseFloat(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, displayName: row.display_name };
}

/**
 * Yapılandırılmış arama: aynı sokak adı başka ilde eşleşmesin diye şehir/ülke ayrımı verilir.
 * https://nominatim.org/release-docs/develop/api/Search/
 */
export async function geocodeStructuredServiceAddress(addr: unknown): Promise<GeocodeHit | null> {
  const p = parseServiceAddr(addr);
  if (!p) return null;
  const street = [p.line1, p.line2].filter(Boolean).join(", ");
  if (!street && !p.city) return null;
  const country = p.country || "Türkiye";
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "0",
  });
  if (street) params.set("street", street);
  if (p.city) params.set("city", p.city);
  if (p.region) params.set("state", p.region);
  if (p.postal_code) params.set("postalcode", p.postal_code);
  params.set("country", country);
  const codes = inferCountryCodesForNominatim(addr);
  if (codes) params.set("countrycodes", codes);
  return nominatimGet(params);
}

/** Tek satır adres metni (ör. line1, city, country). */
export async function geocodeAddressLine(
  query: string,
  countryCodes?: string | null,
): Promise<GeocodeHit | null> {
  const q = query.trim();
  if (!q) return null;
  const params = new URLSearchParams({ format: "json", limit: "1", q });
  if (countryCodes) params.set("countrycodes", countryCodes);
  return nominatimGet(params);
}

export function formatServiceAddressForGeocode(addr: unknown): string | null {
  const p = parseServiceAddr(addr);
  if (!p) return null;
  const parts = [p.line1, p.line2, p.city, p.region, p.postal_code, p.country].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(", ");
}

/** Önce yapılandırılmış arama, yoksa q= + countrycodes. */
export async function geocodeServiceAddressBest(addr: unknown): Promise<GeocodeHit | null> {
  const structured = await geocodeStructuredServiceAddress(addr);
  if (structured) return structured;
  const q = formatServiceAddressForGeocode(addr);
  if (!q) return null;
  const codes = inferCountryCodesForNominatim(addr);
  return geocodeAddressLine(q, codes);
}

/** Nominatim politikası: ardışık isteklerde gecikme (serbest metin; ülke filtresi yok). */
export async function geocodeWithThrottle(query: string): Promise<GeocodeHit | null> {
  await sleep(1100);
  return geocodeAddressLine(query, null);
}

/** Saha `service_address` nesnesi: yapılandırılmış arama + TR/countrycodes. */
export async function geocodeWithThrottleForServiceAddress(addr: unknown): Promise<GeocodeHit | null> {
  await sleep(1100);
  return geocodeServiceAddressBest(addr);
}
