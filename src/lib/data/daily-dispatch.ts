import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { getTenantClusterState } from "@/lib/data/route-cluster-state";
import { recomputeTenantRouteClusters } from "@/lib/data/route-plans";

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Açık arıza / onarım iş emirleri: önce acil ve yüksek öncelik, sonra oluşturulma zamanı. */
async function listOpenBreakdownAssetIdsOrdered(tenantId: string, crewId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ elevator_asset_id: string }>(
    `SELECT elevator_asset_id::text AS elevator_asset_id
     FROM work_orders
     WHERE tenant_id = $1::uuid AND blocking_crew_id = $2::uuid
       AND work_type IN ('repair', 'emergency_breakdown')
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY
       CASE COALESCE(priority, 'normal')
         WHEN 'high' THEN 0
         WHEN 'urgent' THEN 0
         ELSE 1
       END,
       is_emergency DESC,
       created_at ASC`,
    [tenantId, crewId],
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const id = r.elevator_asset_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function istanbulDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function dayOfYearIstanbul(d: Date = new Date()): number {
  const s = istanbulDateString(d);
  return dayOfYearFromIsoDate(s);
}

export function dayOfYearFromIsoDate(isoDate: string): number {
  const s = isoDate.trim().slice(0, 10);
  const [y, m, day] = s.split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !day) return 1;
  const start = Date.UTC(y, 0, 0);
  const cur = Date.UTC(y, m - 1, day);
  return Math.floor((cur - start) / 86400000);
}

export function istanbulHour(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "numeric",
      hour12: false,
    }).format(d),
  );
}

async function replaceDailyDispatchPg(params: {
  tenantId: string;
  crewId: string;
  dispatchDate: string;
  maxStops: number;
  clusterPick: number;
  assetIds: string[];
}): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM daily_crew_dispatch_stops WHERE dispatch_id IN (
         SELECT id FROM daily_crew_dispatches WHERE tenant_id = $1 AND crew_id = $2 AND dispatch_date = $3::date
       )`,
      [params.tenantId, params.crewId, params.dispatchDate],
    );
    await client.query(
      `DELETE FROM daily_crew_dispatches WHERE tenant_id = $1 AND crew_id = $2 AND dispatch_date = $3::date`,
      [params.tenantId, params.crewId, params.dispatchDate],
    );
    if (!params.assetIds.length) {
      await client.query("COMMIT");
      return 0;
    }
    const ins = await client.query<{ id: string }>(
      `INSERT INTO daily_crew_dispatches (tenant_id, crew_id, dispatch_date, cluster_index, max_stops)
       VALUES ($1, $2, $3::date, $4, $5) RETURNING id`,
      [params.tenantId, params.crewId, params.dispatchDate, params.clusterPick, params.maxStops],
    );
    const dispatchId = ins.rows[0]?.id;
    if (!dispatchId) throw new Error("dispatch");
    let seq = 0;
    for (const aid of params.assetIds) {
      const { rows: ar } = await client.query<{ site_id: string }>(
        `SELECT site_id FROM elevator_assets WHERE tenant_id = $1 AND id = $2`,
        [params.tenantId, aid],
      );
      const siteId = ar[0]?.site_id;
      if (!siteId) continue;
      await client.query(
        `INSERT INTO daily_crew_dispatch_stops (tenant_id, dispatch_id, sequence, elevator_asset_id, site_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [params.tenantId, dispatchId, seq, aid, siteId],
      );
      seq++;
    }
    await client.query("COMMIT");
    return seq;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Günlük sevk: küme durumundan bir küme seçilir, en fazla `maxStops` durak yazılır (varsayılan 10).
 */
export async function replaceDailyDispatchForCrew(params: {
  tenantId: string;
  crewId: string;
  dispatchDate: string;
  maxStops?: number;
}): Promise<
  { ok: true; stopCount: number; clusterIndex: number | null } | { ok: false; error: string }
> {
  const max = Math.min(50, Math.max(1, params.maxStops ?? 10));
  let state = await getTenantClusterState(params.tenantId);
  if (!state?.clusters.length) {
    try {
      await recomputeTenantRouteClusters(params.tenantId);
      state = await getTenantClusterState(params.tenantId);
    } catch {
      state = null;
    }
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, error: "Günlük sevk için DATABASE_URL (doğrudan PG) gerekli" };
  }
  if (!state?.clusters.length) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM daily_crew_dispatch_stops WHERE dispatch_id IN (
         SELECT id FROM daily_crew_dispatches WHERE tenant_id = $1 AND crew_id = $2 AND dispatch_date = $3::date
       )`,
      [params.tenantId, params.crewId, params.dispatchDate],
    );
    await pool.query(
      `DELETE FROM daily_crew_dispatches WHERE tenant_id = $1 AND crew_id = $2 AND dispatch_date = $3::date`,
      [params.tenantId, params.crewId, params.dispatchDate],
    );
    return { ok: true, stopCount: 0, clusterIndex: null };
  }
  const n = state.clusters.length;
  const pick = (dayOfYearFromIsoDate(params.dispatchDate) + simpleHash(params.crewId)) % n;
  const chosen = state.clusters[pick];
  if (!chosen) return { ok: false, error: "Küme seçilemedi" };
  const breakdownIds = await listOpenBreakdownAssetIdsOrdered(params.tenantId, params.crewId);
  const bdTake = breakdownIds.slice(0, max);
  const bdSet = new Set(bdTake);
  const roomForCluster = Math.max(0, max - bdTake.length);
  const fromCluster = chosen.ordered_asset_ids.filter((id) => !bdSet.has(id)).slice(0, roomForCluster);
  const assetIds = [...bdTake, ...fromCluster];
  try {
    const stopCount = await replaceDailyDispatchPg({
      tenantId: params.tenantId,
      crewId: params.crewId,
      dispatchDate: params.dispatchDate,
      maxStops: max,
      clusterPick: pick,
      assetIds,
    });
    return { ok: true, stopCount, clusterIndex: pick };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sevk yazılamadı" };
  }
}

export async function runMorningDispatchesForAllTenants(isoDate: string): Promise<{
  tenantCount: number;
  crewCount: number;
}> {
  const pool = getPool();
  const { rows: crews } = await pool.query<{ tenant_id: string; id: string }>(
    `SELECT tenant_id, id FROM field_crews ORDER BY tenant_id, id`,
  );
  const tenants = new Set<string>();
  let okCrews = 0;
  for (const c of crews) {
    const r = await replaceDailyDispatchForCrew({
      tenantId: c.tenant_id,
      crewId: c.id,
      dispatchDate: isoDate,
      maxStops: 10,
    });
    if (r.ok) {
      okCrews++;
      tenants.add(c.tenant_id);
    }
  }
  return { tenantCount: tenants.size, crewCount: okCrews };
}

export type DailyDispatchStopDetail = {
  id: string;
  sequence: number;
  elevator_asset_id: string;
  site_id: string;
  unit_code: string;
  site_name: string;
};

export async function listDailyDispatchStopsDetail(
  tenantId: string,
  crewId: string,
  dispatchDate: string,
): Promise<DailyDispatchStopDetail[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: disp } = await supabase
      .from("daily_crew_dispatches")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId)
      .eq("dispatch_date", dispatchDate)
      .maybeSingle();
    if (!disp?.id) return [];
    const { data: stops } = await supabase
      .from("daily_crew_dispatch_stops")
      .select("id, sequence, elevator_asset_id, site_id")
      .eq("tenant_id", tenantId)
      .eq("dispatch_id", disp.id)
      .order("sequence", { ascending: true });
    if (!stops?.length) return [];
    const assetIds = [...new Set(stops.map((s) => s.elevator_asset_id as string))];
    const siteIds = [...new Set(stops.map((s) => s.site_id as string))];
    const { data: assets } = await supabase
      .from("elevator_assets")
      .select("id, unit_code")
      .eq("tenant_id", tenantId)
      .in("id", assetIds);
    const { data: sites } = await supabase
      .from("sites")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("id", siteIds);
    const am = new Map((assets ?? []).map((a) => [a.id as string, a]));
    const sm = new Map((sites ?? []).map((s) => [s.id as string, s]));
    return stops.map((s) => ({
      id: s.id as string,
      sequence: Number(s.sequence ?? 0),
      elevator_asset_id: s.elevator_asset_id as string,
      site_id: s.site_id as string,
      unit_code: String(am.get(s.elevator_asset_id as string)?.unit_code ?? "—"),
      site_name: String(sm.get(s.site_id as string)?.name ?? "—"),
    }));
  }
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    sequence: number;
    elevator_asset_id: string;
    site_id: string;
    unit_code: string;
    site_name: string;
  }>(
    `SELECT ds.id, ds.sequence, ds.elevator_asset_id, ds.site_id,
            ea.unit_code, s.name AS site_name
     FROM daily_crew_dispatches d
     JOIN daily_crew_dispatch_stops ds ON ds.dispatch_id = d.id AND ds.tenant_id = d.tenant_id
     JOIN elevator_assets ea ON ea.id = ds.elevator_asset_id AND ea.tenant_id = ds.tenant_id
     JOIN sites s ON s.id = ds.site_id AND s.tenant_id = ds.tenant_id
     WHERE d.tenant_id = $1 AND d.crew_id = $2 AND d.dispatch_date = $3::date
     ORDER BY ds.sequence`,
    [tenantId, crewId, dispatchDate],
  );
  return rows;
}
