import { isSupabaseConfigured } from "@/lib/auth/config";
import {
  addUtcWorkdays,
  assignWorkdaysFromMonthStart,
  breakdownShiftWorkdays,
  capacitatedGeographicClusters,
  dateOnlyUtc,
  orderClusterByShortestWalk,
  packOrderedClustersIntoDays,
  parseYearMonth,
  type RoutePoint,
} from "@/lib/domain/route-planning";
import {
  formatServiceAddressForGeocode,
  geocodeWithThrottleForServiceAddress,
} from "@/lib/maps/nominatim-geocode";
import { getPool } from "@/lib/db/pool";
import { clustersToJson, upsertTenantClusterState } from "@/lib/data/route-cluster-state";
import { getRoutePlanningSettings } from "@/lib/data/tenant-route-settings";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveRouteSupabase(routeSupabase?: SupabaseClient | null): Promise<SupabaseClient | null> {
  if (routeSupabase) return routeSupabase;
  return await createClient();
}

export function extractLatLngFromGeo(geo: unknown): { lat: number; lng: number } | null {
  if (!geo || typeof geo !== "object") return null;
  const g = geo as Record<string, unknown>;
  const lat = g.lat ?? g.latitude;
  const lng = g.lng ?? g.longitude ?? g.lon;
  const la = typeof lat === "number" ? lat : Number.parseFloat(String(lat ?? ""));
  const ln = typeof lng === "number" ? lng : Number.parseFloat(String(lng ?? ""));
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return { lat: la, lng: ln };
}

/**
 * Yalnızca `sites.geo` boşken rota noktası üretmek için. Her `site_id` için deterministik farklı
 * bir nokta verir (~36–42°N, 26–44°E). Haritada / kümelerde üniteler Türkiye geneline yayılmış
 * görünüyorsa kök neden çoğunlukla eksik veya geçersiz `geo` (gerçek adres koordinatı değil).
 */
function pseudoCoordForSite(siteId: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < siteId.length; i++) {
    h = (Math.imul(31, h) + siteId.charCodeAt(i)) | 0;
  }
  const u = Math.abs(h % 10_000) / 10_000;
  const v = Math.abs((h >> 8) % 10_000) / 10_000;
  return { lat: 36 + u * 6, lng: 26 + v * 18 };
}

function fmtUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadRoutePointsPg(
  tenantId: string,
  maintenanceActiveOnly: boolean,
): Promise<RoutePoint[]> {
  const pool = getPool();
  const statusClause = maintenanceActiveOnly
    ? `AND ea.operational_status = 'in_service'
       AND EXISTS (
         SELECT 1 FROM maintenance_plans mp
         WHERE mp.tenant_id = ea.tenant_id AND mp.asset_id = ea.id AND mp.active = true
       )`
    : `AND ea.operational_status <> 'decommissioned'`;
  const { rows } = await pool.query<{
    id: string;
    site_id: string;
    unit_code: string;
    geo: unknown;
  }>(
    `SELECT ea.id, ea.site_id, ea.unit_code, s.geo
     FROM elevator_assets ea
     JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1
       ${statusClause}`,
    [tenantId],
  );
  return rows.map((r) => {
    const g = extractLatLngFromGeo(r.geo);
    const coord = g ?? pseudoCoordForSite(r.site_id);
    return {
      elevator_asset_id: r.id,
      site_id: r.site_id,
      unit_code: r.unit_code?.trim() || "—",
      lat: coord.lat,
      lng: coord.lng,
    };
  });
}

async function loadRoutePoints(
  tenantId: string,
  maintenanceActiveOnly: boolean,
  routeSupabase?: SupabaseClient | null,
): Promise<RoutePoint[]> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      return await loadRoutePointsPg(tenantId, maintenanceActiveOnly);
    } catch {
      /* pool yoksa veya hata: Supabase */
    }
  }
  if (isSupabaseConfigured()) {
    const supabase = await resolveRouteSupabase(routeSupabase);
    if (!supabase) return [];
    let assetQuery = supabase
      .from("elevator_assets")
      .select("id, site_id, unit_code, operational_status")
      .eq("tenant_id", tenantId);
    if (maintenanceActiveOnly) {
      assetQuery = assetQuery.eq("operational_status", "in_service");
      const { data: plans } = await supabase
        .from("maintenance_plans")
        .select("asset_id")
        .eq("tenant_id", tenantId)
        .eq("active", true);
      const allowed = [...new Set((plans ?? []).map((p) => String(p.asset_id ?? "")).filter(Boolean))];
      if (!allowed.length) return [];
      assetQuery = assetQuery.in("id", allowed);
    } else {
      assetQuery = assetQuery.neq("operational_status", "decommissioned");
    }
    const { data: assets, error: aErr } = await assetQuery;
    if (aErr || !assets?.length) return [];
    const siteIds = [...new Set(assets.map((a) => a.site_id as string))];
    const { data: sites } = await supabase.from("sites").select("id, geo").in("id", siteIds);
    const geoBySite = new Map((sites ?? []).map((s) => [s.id as string, s.geo]));
    const out: RoutePoint[] = [];
    for (const row of assets) {
      const id = String(row.id ?? "");
      const siteId = String(row.site_id ?? "");
      const unit = String(row.unit_code ?? "").trim() || "—";
      const g = extractLatLngFromGeo(geoBySite.get(siteId) ?? null);
      const coord = g ?? pseudoCoordForSite(siteId);
      out.push({
        elevator_asset_id: id,
        site_id: siteId,
        unit_code: unit,
        lat: coord.lat,
        lng: coord.lng,
      });
    }
    return out;
  }
  return loadRoutePointsPg(tenantId, maintenanceActiveOnly);
}

/** Önce aktif aylık bakım planı olan üniteler; yoksa tüm hizmetteki asansörler (az üyeli hesaplar için). */
export async function listRoutePointsForTenant(
  tenantId: string,
  routeSupabase?: SupabaseClient | null,
): Promise<RoutePoint[]> {
  const primary = await loadRoutePoints(tenantId, true, routeSupabase);
  if (primary.length) return primary;
  return loadRoutePoints(tenantId, false, routeSupabase);
}

export async function ensureGeocodingForSites(
  tenantId: string,
  siteIds: string[],
  routeSupabase?: SupabaseClient | null,
  opts?: { force?: boolean },
): Promise<void> {
  const force = Boolean(opts?.force);
  const unique = [...new Set(siteIds.filter(Boolean))];
  if (!unique.length) return;

  type SiteRow = { id: string; geo: unknown; service_address: unknown };
  let rows: SiteRow[] = [];

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const pool = getPool();
      const r = await pool.query<SiteRow>(
        `SELECT id, geo, service_address FROM sites WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, unique],
      );
      rows = r.rows;
    } catch {
      rows = [];
    }
  }
  if (!rows.length && isSupabaseConfigured()) {
    const supabase = await resolveRouteSupabase(routeSupabase);
    if (!supabase) return;
    const { data } = await supabase
      .from("sites")
      .select("id, geo, service_address")
      .eq("tenant_id", tenantId)
      .in("id", unique);
    rows = (data ?? []) as SiteRow[];
  }
  if (!rows.length) return;

  for (const s of rows) {
    if (!force && extractLatLngFromGeo(s.geo)) continue;
    if (!formatServiceAddressForGeocode(s.service_address)) continue;
    const hit = await geocodeWithThrottleForServiceAddress(s.service_address);
    if (!hit) continue;
    const geoJson = {
      lat: hit.lat,
      lng: hit.lng,
      source: "nominatim",
      geocoded_at: new Date().toISOString(),
    };
    if (process.env.DATABASE_URL?.trim()) {
      try {
        const pool = getPool();
        await pool.query(`UPDATE sites SET geo = $1::jsonb WHERE tenant_id = $2 AND id = $3`, [
          JSON.stringify(geoJson),
          tenantId,
          s.id,
        ]);
        continue;
      } catch {
        /* supabase */
      }
    }
    if (isSupabaseConfigured()) {
      const supabase = await resolveRouteSupabase(routeSupabase);
      if (supabase) {
        await supabase.from("sites").update({ geo: geoJson }).eq("tenant_id", tenantId).eq("id", s.id);
      }
    } else {
      const pool = getPool();
      await pool.query(`UPDATE sites SET geo = $1::jsonb WHERE tenant_id = $2 AND id = $3`, [
        JSON.stringify(geoJson),
        tenantId,
        s.id,
      ]);
    }
  }
}

export async function recomputeTenantRouteClusters(
  tenantId: string,
  routeSupabase?: SupabaseClient | null,
): Promise<void> {
  const { cluster_radius_km, max_units_per_cluster } = await getRoutePlanningSettings(tenantId, routeSupabase);
  let points = await listRoutePointsForTenant(tenantId, routeSupabase);
  if (!points.length) {
    await upsertTenantClusterState(tenantId, cluster_radius_km, [], routeSupabase);
    return;
  }
  await ensureGeocodingForSites(tenantId, points.map((p) => p.site_id), routeSupabase);
  points = await listRoutePointsForTenant(tenantId, routeSupabase);
  const raw = capacitatedGeographicClusters(points, max_units_per_cluster);
  const ordered = raw.map((c) => orderClusterByShortestWalk(c));
  await upsertTenantClusterState(tenantId, cluster_radius_km, clustersToJson(ordered), routeSupabase);
}

export async function crewBelongsToTenant(tenantId: string, crewId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("field_crews")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", crewId)
      .maybeSingle();
    return Boolean(data);
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT 1 FROM field_crews WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    crewId,
  ]);
  return rows.length > 0;
}

export async function generateMonthlyRoutePlan(
  tenantId: string,
  crewId: string,
  yearMonth: string,
  visitsPerDay: number,
): Promise<{ ok: true; planId: string; stopCount: number } | { ok: false; error: string }> {
  const ym = parseYearMonth(yearMonth);
  if (!ym) return { ok: false, error: "year_month geçersiz (YYYY-AA)" };
  if (!(await crewBelongsToTenant(tenantId, crewId))) {
    return { ok: false, error: "Ekip bulunamadı" };
  }
  const cap = Math.max(1, Math.min(50, visitsPerDay));
  const { cluster_radius_km, max_units_per_cluster } = await getRoutePlanningSettings(tenantId);
  let points = await listRoutePointsForTenant(tenantId);
  if (!points.length) return { ok: false, error: "Rota için asansör yok" };

  await ensureGeocodingForSites(
    tenantId,
    points.map((p) => p.site_id),
  );
  points = await listRoutePointsForTenant(tenantId);

  const rawClusters = capacitatedGeographicClusters(points, max_units_per_cluster);
  const orderedClusters = rawClusters.map((c) => orderClusterByShortestWalk(c));
  await upsertTenantClusterState(tenantId, cluster_radius_km, clustersToJson(orderedClusters));

  const batches = packOrderedClustersIntoDays(orderedClusters, cap);
  const workdays = assignWorkdaysFromMonthStart(ym.y, ym.m, batches.length);
  if (workdays.length < batches.length) {
    return { ok: false, error: "Takvim günü üretilemedi; çok fazla günlük rota" };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: "Supabase yok" };
    await supabase
      .from("monthly_route_plans")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId)
      .eq("year_month", yearMonth.trim());

    const { data: planRow, error: pErr } = await supabase
      .from("monthly_route_plans")
      .insert({
        tenant_id: tenantId,
        crew_id: crewId,
        year_month: yearMonth.trim(),
        visits_per_day: cap,
        meta: {
          assetCount: points.length,
          batchCount: batches.length,
          cluster_radius_km,
          cluster_count: orderedClusters.length,
        },
      })
      .select("id")
      .single();
    if (pErr || !planRow?.id) return { ok: false, error: pErr?.message ?? "Plan oluşturulamadı" };
    const planId = planRow.id as string;

    const stopRows: Record<string, unknown>[] = [];
    for (let bi = 0; bi < batches.length; bi++) {
      const day = workdays[bi]!;
      const batch = batches[bi]!;
      const dateStr = fmtUtcDate(day);
      for (let si = 0; si < batch.length; si++) {
        const p = batch[si]!;
        stopRows.push({
          tenant_id: tenantId,
          plan_id: planId,
          service_date: dateStr,
          sequence: si,
          elevator_asset_id: p.elevator_asset_id,
          site_id: p.site_id,
          cluster_index: bi,
          status: "scheduled",
        });
      }
    }
    const { error: sErr } = await supabase.from("daily_route_stops").insert(stopRows);
    if (sErr) return { ok: false, error: sErr.message };
    return { ok: true, planId, stopCount: stopRows.length };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM monthly_route_plans WHERE tenant_id = $1 AND crew_id = $2 AND year_month = $3`,
      [tenantId, crewId, yearMonth.trim()],
    );
    const ins = await client.query<{ id: string }>(
      `INSERT INTO monthly_route_plans (tenant_id, crew_id, year_month, visits_per_day, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        tenantId,
        crewId,
        yearMonth.trim(),
        cap,
        JSON.stringify({
          assetCount: points.length,
          batchCount: batches.length,
          cluster_radius_km,
          cluster_count: orderedClusters.length,
        }),
      ],
    );
    const planId = ins.rows[0]?.id;
    if (!planId) throw new Error("plan id");
    for (let bi = 0; bi < batches.length; bi++) {
      const day = workdays[bi]!;
      const batch = batches[bi]!;
      const dateStr = fmtUtcDate(day);
      for (let si = 0; si < batch.length; si++) {
        const p = batch[si]!;
        await client.query(
          `INSERT INTO daily_route_stops (
             tenant_id, plan_id, service_date, sequence, elevator_asset_id, site_id, cluster_index, status
           ) VALUES ($1, $2, $3::date, $4, $5, $6, $7, 'scheduled')`,
          [tenantId, planId, dateStr, si, p.elevator_asset_id, p.site_id, bi],
        );
      }
    }
    await client.query("COMMIT");
    let stopCount = 0;
    for (const b of batches) stopCount += b.length;
    return { ok: true, planId, stopCount };
  } catch (e) {
    await client.query("ROLLBACK");
    return { ok: false, error: e instanceof Error ? e.message : "Plan kaydı başarısız" };
  } finally {
    client.release();
  }
}

export type DailyStopDetail = {
  id: string;
  service_date: string;
  sequence: number;
  elevator_asset_id: string;
  site_id: string;
  unit_code: string;
  site_name: string;
  lat: number | null;
  lng: number | null;
  cluster_index: number;
  status: string;
};

export async function listDailyStopsForPlan(
  tenantId: string,
  planId: string,
): Promise<DailyStopDetail[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: stops } = await supabase
      .from("daily_route_stops")
      .select("id, service_date, sequence, elevator_asset_id, site_id, cluster_index, status")
      .eq("tenant_id", tenantId)
      .eq("plan_id", planId)
      .order("service_date", { ascending: true })
      .order("sequence", { ascending: true });
    if (!stops?.length) return [];
    const siteIds = [...new Set(stops.map((s) => s.site_id as string))];
    const assetIds = [...new Set(stops.map((s) => s.elevator_asset_id as string))];
    const { data: sites } = await supabase.from("sites").select("id, name, geo").in("id", siteIds);
    const { data: assets } = await supabase.from("elevator_assets").select("id, unit_code").in("id", assetIds);
    const smap = new Map((sites ?? []).map((s) => [s.id as string, s]));
    const amap = new Map((assets ?? []).map((a) => [a.id as string, a]));
    return stops.map((s) => {
      const site = smap.get(s.site_id as string);
      const asset = amap.get(s.elevator_asset_id as string);
      const ll = extractLatLngFromGeo(site?.geo ?? null);
      return {
        id: s.id as string,
        service_date: String(s.service_date ?? "").slice(0, 10),
        sequence: Number(s.sequence ?? 0),
        elevator_asset_id: s.elevator_asset_id as string,
        site_id: s.site_id as string,
        unit_code: String(asset?.unit_code ?? "—"),
        site_name: String(site?.name ?? "—"),
        lat: ll?.lat ?? null,
        lng: ll?.lng ?? null,
        cluster_index: Number(s.cluster_index ?? 0),
        status: String(s.status ?? "scheduled"),
      };
    });
  }
  const pool = getPool();
  const { rows } = await pool.query<
    DailyStopDetail & { geo: unknown }
  >(
    `SELECT drs.id,
            drs.service_date::text AS service_date,
            drs.sequence,
            drs.elevator_asset_id,
            drs.site_id,
            ea.unit_code,
            s.name AS site_name,
            s.geo,
            drs.cluster_index,
            drs.status
     FROM daily_route_stops drs
     JOIN elevator_assets ea ON ea.id = drs.elevator_asset_id AND ea.tenant_id = drs.tenant_id
     JOIN sites s ON s.id = drs.site_id AND s.tenant_id = drs.tenant_id
     WHERE drs.tenant_id = $1 AND drs.plan_id = $2
     ORDER BY drs.service_date, drs.sequence`,
    [tenantId, planId],
  );
  return rows.map((r) => {
    const ll = extractLatLngFromGeo(r.geo);
    const { geo: _g, ...rest } = r;
    void _g;
    return {
      ...rest,
      lat: ll?.lat ?? null,
      lng: ll?.lng ?? null,
    };
  });
}

export async function getMonthlyPlanId(
  tenantId: string,
  crewId: string,
  yearMonth: string,
): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("monthly_route_plans")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId)
      .eq("year_month", yearMonth.trim())
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM monthly_route_plans
     WHERE tenant_id = $1 AND crew_id = $2 AND year_month = $3`,
    [tenantId, crewId, yearMonth.trim()],
  );
  return rows[0]?.id ?? null;
}

export type BlockingBreakdownRow = {
  id: string;
  number: string;
  created_at: string;
  fault_symptom: string | null;
};

export async function listOpenBlockingBreakdownsForCrew(
  tenantId: string,
  crewId: string,
): Promise<BlockingBreakdownRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("work_orders")
      .select("id, number, created_at, fault_symptom")
      .eq("tenant_id", tenantId)
      .eq("blocking_crew_id", crewId)
      .in("work_type", ["repair", "emergency_breakdown"])
      .neq("status", "completed")
      .neq("status", "cancelled");
    return (data ?? []) as BlockingBreakdownRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<BlockingBreakdownRow>(
    `SELECT id, number, created_at::text, fault_symptom FROM work_orders
     WHERE tenant_id = $1 AND blocking_crew_id = $2
       AND work_type IN ('repair', 'emergency_breakdown')
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC`,
    [tenantId, crewId],
  );
  return rows;
}

export async function shiftRoutePlansAfterBreakdownResolved(
  tenantId: string,
  crewId: string,
  openedAtIso: string,
  closedAtIso: string,
): Promise<{ ok: true; shifted: number } | { ok: false; error: string }> {
  const opened = dateOnlyUtc(openedAtIso);
  const closed = dateOnlyUtc(closedAtIso);
  const shiftWd = breakdownShiftWorkdays(opened, closed);
  if (shiftWd <= 0) return { ok: true, shifted: 0 };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: "Supabase yok" };
    const openStr = fmtUtcDate(opened);
    const { data: crewPlans } = await supabase
      .from("monthly_route_plans")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId);
    const planIds = (crewPlans ?? []).map((p) => p.id as string);
    if (!planIds.length) return { ok: true, shifted: 0 };
    const { data: stops } = await supabase
      .from("daily_route_stops")
      .select("id, service_date")
      .eq("tenant_id", tenantId)
      .in("plan_id", planIds)
      .gte("service_date", openStr);
    if (!stops?.length) return { ok: true, shifted: 0 };
    let shifted = 0;
    for (const s of stops) {
      const oldD = dateOnlyUtc(String(s.service_date));
      const newD = addUtcWorkdays(oldD, shiftWd);
      const { error } = await supabase
        .from("daily_route_stops")
        .update({ service_date: fmtUtcDate(newD) })
        .eq("tenant_id", tenantId)
        .eq("id", s.id as string);
      if (!error) shifted++;
    }
    return { ok: true, shifted };
  }

  const pool = getPool();
  const openStr = fmtUtcDate(opened);
  const { rows } = await pool.query<{ id: string; service_date: string }>(
    `SELECT drs.id, drs.service_date::text AS service_date
     FROM daily_route_stops drs
     JOIN monthly_route_plans p ON p.id = drs.plan_id
     WHERE drs.tenant_id = $1 AND p.crew_id = $2 AND drs.service_date >= $3::date`,
    [tenantId, crewId, openStr],
  );
  let shifted = 0;
  for (const r of rows) {
    const oldD = dateOnlyUtc(r.service_date);
    const newD = addUtcWorkdays(oldD, shiftWd);
    await pool.query(`UPDATE daily_route_stops SET service_date = $1::date WHERE tenant_id = $2 AND id = $3`, [
      fmtUtcDate(newD),
      tenantId,
      r.id,
    ]);
    shifted++;
  }
  return { ok: true, shifted };
}

export async function insertFieldCrew(
  tenantId: string,
  name: string,
  memberUserIds: string[],
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const n = name.trim();
  if (!n) return { ok: false, error: "Ekip adı gerekli" };
  const ids = [...new Set(memberUserIds.filter(Boolean))];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: "Supabase yok" };
    const { data: crew, error: cErr } = await supabase
      .from("field_crews")
      .insert({ tenant_id: tenantId, name: n })
      .select("id")
      .single();
    if (cErr || !crew?.id) return { ok: false, error: cErr?.message ?? "Ekip eklenemedi" };
    const crewId = crew.id as string;
    if (ids.length) {
      const { error: mErr } = await supabase.from("field_crew_members").insert(
        ids.map((uid) => ({ tenant_id: tenantId, crew_id: crewId, user_id: uid })),
      );
      if (mErr) return { ok: false, error: mErr.message };
    }
    return { ok: true, id: crewId };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query<{ id: string }>(
      `INSERT INTO field_crews (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [tenantId, n],
    );
    const crewId = ins.rows[0]?.id;
    if (!crewId) throw new Error("crew");
    for (const uid of ids) {
      await client.query(
        `INSERT INTO field_crew_members (tenant_id, crew_id, user_id) VALUES ($1, $2, $3)
         ON CONFLICT (crew_id, user_id) DO NOTHING`,
        [tenantId, crewId, uid],
      );
    }
    await client.query("COMMIT");
    return { ok: true, id: crewId };
  } catch (e) {
    await client.query("ROLLBACK");
    return { ok: false, error: e instanceof Error ? e.message : "Ekip kaydı başarısız" };
  } finally {
    client.release();
  }
}
