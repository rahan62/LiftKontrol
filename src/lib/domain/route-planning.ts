export type RoutePoint = {
  elevator_asset_id: string;
  site_id: string;
  unit_code: string;
  lat: number;
  lng: number;
};

const EARTH_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(x)));
}

class UnionFind {
  private readonly parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

/**
 * İki nokta çiftleri arası mesafe ≤ radiusKm ise aynı kümede (geçişli kapanım).
 * Tek başına kalan asansörler de geçerli bir kümedir (yeni hesaplarda az ünite).
 */
export function clusterPointsByRadius(points: RoutePoint[], radiusKm: number): RoutePoint[][] {
  const n = points.length;
  if (n === 0) return [];
  const r = Math.max(0.1, radiusKm);
  const uf = new UnionFind(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineKm(points[i]!, points[j]!) <= r) uf.union(i, j);
    }
  }
  const buckets = new Map<number, RoutePoint[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root)!.push(points[i]!);
  }
  return [...buckets.values()];
}

/** Komşu-en yakın sezgiseli ile küme içi ziyaret sırası (TSP yaklaşımı). */
export function orderClusterByShortestWalk(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 1) return [...points];
  const remaining = [...points];
  const startIdx = remaining.reduce((best, p, i, arr) => (p.lat > arr[best]!.lat ? i : best), 0);
  const ordered: RoutePoint[] = [remaining.splice(startIdx, 1)[0]!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1]!;
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(last, remaining[i]!);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    ordered.push(remaining.splice(bestI, 1)[0]!);
  }
  return ordered;
}

export function centroidOfPoints(points: RoutePoint[]): { lat: number; lng: number } {
  if (!points.length) return { lat: 0, lng: 0 };
  let slat = 0;
  let slng = 0;
  for (const p of points) {
    slat += p.lat;
    slng += p.lng;
  }
  return { lat: slat / points.length, lng: slng / points.length };
}

/**
 * Kapasiteli coğrafi kümeleme (CVRP benzeri sezgisel, kütüphane gerektirmez).
 * Her küme en fazla `maxPerCluster` ünite; kuzeyden başlayıp ağırlık merkezine en yakın komşu ile küme doldurulur.
 * Böylece 3 ünite tek kümede toplanır; 200 ünite ~20 küme (10’ar) olur. Yakıt/zaman için makul bir ilk çözümdür.
 * Daha iyi optimizasyon: OR-Tools CVRP, jsprit veya meta-sezgisel (2-opt) ile iyileştirme.
 */
export function capacitatedGeographicClusters(points: RoutePoint[], maxPerCluster: number): RoutePoint[][] {
  const cap = Math.max(1, Math.min(50, Math.floor(maxPerCluster)));
  if (points.length === 0) return [];

  const unassigned = [...points];
  const clusters: RoutePoint[][] = [];

  while (unassigned.length > 0) {
    let seedIdx = 0;
    let bestLat = unassigned[0]!.lat;
    for (let i = 1; i < unassigned.length; i++) {
      if (unassigned[i]!.lat > bestLat) {
        bestLat = unassigned[i]!.lat;
        seedIdx = i;
      }
    }
    const cluster: RoutePoint[] = [unassigned.splice(seedIdx, 1)[0]!];

    while (cluster.length < cap && unassigned.length > 0) {
      const cen = centroidOfPoints(cluster);
      let nextIdx = 0;
      let bestD = Infinity;
      for (let j = 0; j < unassigned.length; j++) {
        const d = haversineKm(cen, unassigned[j]!);
        if (d < bestD) {
          bestD = d;
          nextIdx = j;
        }
      }
      cluster.push(unassigned.splice(nextIdx, 1)[0]!);
    }
    clusters.push(cluster);
  }

  clusters.sort((a, b) => centroidOfPoints(b).lat - centroidOfPoints(a).lat);
  return clusters;
}

/**
 * Kümeleri kuzeyden güneye sıralayıp günlük kapasiteye göre paketler; büyük kümeler bölünür.
 */
export function packOrderedClustersIntoDays(clusters: RoutePoint[][], dayCapacity: number): RoutePoint[][] {
  const cap = Math.max(1, Math.min(50, dayCapacity));
  const orderedClusters = clusters
    .map((c) => orderClusterByShortestWalk(c))
    .sort((a, b) => centroidOfPoints(b).lat - centroidOfPoints(a).lat);
  const days: RoutePoint[][] = [];
  let current: RoutePoint[] = [];
  const flush = () => {
    if (current.length) {
      days.push(current);
      current = [];
    }
  };
  for (const cl of orderedClusters) {
    let idx = 0;
    while (idx < cl.length) {
      const space = cap - current.length;
      if (space === 0) {
        flush();
        continue;
      }
      const slice = cl.slice(idx, idx + space);
      current.push(...slice);
      idx += slice.length;
      if (current.length >= cap) flush();
    }
  }
  flush();
  return days;
}

/** Greedy nearest-neighbor batches (~geographic clusters, ~capacity per day). */
export function greedyDailyBatches(points: RoutePoint[], dayCapacity: number): RoutePoint[][] {
  if (points.length === 0) return [];
  const cap = Math.max(1, Math.min(50, dayCapacity));
  const remaining = [...points];
  remaining.sort((a, b) => b.lat - a.lat);
  const batches: RoutePoint[][] = [];

  while (remaining.length) {
    let cur = remaining.shift()!;
    const batch: RoutePoint[] = [cur];
    while (batch.length < cap && remaining.length) {
      let bestI = 0;
      let bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineKm(cur, remaining[i]!);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      cur = remaining.splice(bestI, 1)[0]!;
      batch.push(cur);
    }
    batches.push(batch);
  }
  return batches;
}

export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** UTC date at midnight for stable serialization (service_date is date-only). */
export function utcDay(y: number, m0: number, day: number): Date {
  return new Date(Date.UTC(y, m0, day));
}

export function parseYearMonth(ym: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

/** First N workdays starting at month start; continues into next month if needed. */
export function assignWorkdaysFromMonthStart(
  year: number,
  month1: number,
  batchCount: number,
): Date[] {
  const out: Date[] = [];
  let y = year;
  let m0 = month1 - 1;
  let d = 1;
  for (let i = 0; i < 400 && out.length < batchCount; i++) {
    const last = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    if (d > last) {
      d = 1;
      m0++;
      if (m0 > 11) {
        m0 = 0;
        y++;
      }
      continue;
    }
    const dt = utcDay(y, m0, d);
    if (!isWeekend(dt)) out.push(dt);
    d++;
  }
  return out;
}

/**
 * Inclusive workday count between two calendar dates (UTC midnight), Mon–Fri.
 * Same day → 1 if weekday, else 0.
 */
export function inclusiveWorkdayCount(start: Date, end: Date): number {
  if (end.getTime() < start.getTime()) return 0;
  let n = 0;
  const cur = new Date(start.getTime());
  const cap = 500;
  let i = 0;
  while (cur.getTime() <= end.getTime() && i++ < cap) {
    if (!isWeekend(cur)) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

/**
 * Shift amount: workdays the job was open, minus one (completion day does not consume a route day).
 */
export function breakdownShiftWorkdays(openedDay: Date, closedDay: Date): number {
  const inc = inclusiveWorkdayCount(openedDay, closedDay);
  return Math.max(0, inc - 1);
}

export function addUtcWorkdays(from: Date, workdaysToAdd: number): Date {
  if (workdaysToAdd <= 0) return new Date(from.getTime());
  let left = workdaysToAdd;
  const cur = new Date(from.getTime());
  let guard = 0;
  while (left > 0 && guard < 800) {
    guard++;
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (!isWeekend(cur)) left--;
  }
  return cur;
}

export function dateOnlyUtc(isoOrDate: string | Date): Date {
  if (typeof isoOrDate === "string") {
    const s = isoOrDate.slice(0, 10);
    const [y, m, d] = s.split("-").map((x) => Number.parseInt(x, 10));
    if (!y || !m || !d) return new Date(isoOrDate);
    return utcDay(y, m - 1, d);
  }
  return utcDay(isoOrDate.getUTCFullYear(), isoOrDate.getUTCMonth(), isoOrDate.getUTCDate());
}
