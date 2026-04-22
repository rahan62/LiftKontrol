import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ROUTE_PLANNING_SETTINGS_KEY = "route_planning";
export const DEFAULT_CLUSTER_RADIUS_KM = 2;
export const MAX_CLUSTER_RADIUS_KM = 15;
export const DEFAULT_MAX_UNITS_PER_CLUSTER = 10;
export const MAX_UNITS_PER_CLUSTER_CAP = 50;

export type RoutePlanningSettings = {
  cluster_radius_km: number;
  /** Günlük ekip kapasitesi ile uyumlu: küme başına en fazla bu kadar ünite. */
  max_units_per_cluster: number;
};

function clampRadius(km: number): number {
  if (!Number.isFinite(km)) return DEFAULT_CLUSTER_RADIUS_KM;
  return Math.min(MAX_CLUSTER_RADIUS_KM, Math.max(0.5, Math.round(km * 100) / 100));
}

function clampMaxUnits(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_UNITS_PER_CLUSTER;
  return Math.min(MAX_UNITS_PER_CLUSTER_CAP, Math.max(1, Math.round(n)));
}

type RoutePlanningValueJson = {
  cluster_radius_km?: number;
  max_units_per_cluster?: number;
};

function parseStoredValue(v: unknown): RoutePlanningValueJson {
  if (!v || typeof v !== "object") return {};
  return v as RoutePlanningValueJson;
}

export async function getRoutePlanningSettings(
  tenantId: string,
  routeSupabase?: SupabaseClient | null,
): Promise<RoutePlanningSettings> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const pool = getPool();
      const { rows } = await pool.query<{ value: unknown }>(
        `SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = $2`,
        [tenantId, ROUTE_PLANNING_SETTINGS_KEY],
      );
      const v = parseStoredValue(rows[0]?.value);
      return {
        cluster_radius_km: clampRadius(Number(v.cluster_radius_km ?? DEFAULT_CLUSTER_RADIUS_KM)),
        max_units_per_cluster: clampMaxUnits(Number(v.max_units_per_cluster ?? DEFAULT_MAX_UNITS_PER_CLUSTER)),
      };
    } catch {
      /* fall through */
    }
  }
  if (isSupabaseConfigured()) {
    const supabase = routeSupabase ?? (await createClient());
    if (!supabase) {
      return {
        cluster_radius_km: DEFAULT_CLUSTER_RADIUS_KM,
        max_units_per_cluster: DEFAULT_MAX_UNITS_PER_CLUSTER,
      };
    }
    const { data } = await supabase
      .from("tenant_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", ROUTE_PLANNING_SETTINGS_KEY)
      .maybeSingle();
    const v = parseStoredValue(data?.value);
    return {
      cluster_radius_km: clampRadius(Number(v.cluster_radius_km ?? DEFAULT_CLUSTER_RADIUS_KM)),
      max_units_per_cluster: clampMaxUnits(Number(v.max_units_per_cluster ?? DEFAULT_MAX_UNITS_PER_CLUSTER)),
    };
  }
  const pool = getPool();
  const { rows } = await pool.query<{ value: unknown }>(
    `SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = $2`,
    [tenantId, ROUTE_PLANNING_SETTINGS_KEY],
  );
  const v = parseStoredValue(rows[0]?.value);
  return {
    cluster_radius_km: clampRadius(Number(v.cluster_radius_km ?? DEFAULT_CLUSTER_RADIUS_KM)),
    max_units_per_cluster: clampMaxUnits(Number(v.max_units_per_cluster ?? DEFAULT_MAX_UNITS_PER_CLUSTER)),
  };
}

export async function upsertRoutePlanningSettings(
  tenantId: string,
  partial: Partial<RoutePlanningSettings>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await getRoutePlanningSettings(tenantId);
  const next: RoutePlanningSettings = {
    cluster_radius_km: clampRadius(partial.cluster_radius_km ?? current.cluster_radius_km),
    max_units_per_cluster: clampMaxUnits(partial.max_units_per_cluster ?? current.max_units_per_cluster),
  };
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: "Supabase yok" };
    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: tenantId,
        key: ROUTE_PLANNING_SETTINGS_KEY,
        value: next,
      },
      { onConflict: "tenant_id,key" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, key, value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [tenantId, ROUTE_PLANNING_SETTINGS_KEY, JSON.stringify(next)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt başarısız" };
  }
}
