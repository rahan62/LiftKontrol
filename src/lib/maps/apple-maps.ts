/**
 * Apple Maps web URL with multiple daddr stops (iOS opens Maps app; order preserved where supported).
 */
export function appleMapsDirectionsUrl(stops: { lat: number; lng: number }[]): string {
  if (!stops.length) return "https://maps.apple.com/";
  const parts: string[] = ["https://maps.apple.com/"];
  const q = stops
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => `daddr=${encodeURIComponent(`${s.lat},${s.lng}`)}`);
  if (!q.length) return "https://maps.apple.com/";
  return `${parts[0]}?${q.join("&")}`;
}
