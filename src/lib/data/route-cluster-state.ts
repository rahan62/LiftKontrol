import { isSupabaseConfigured } from "@/lib/auth/config";
import { centroidOfPoints, type RoutePoint } from "@/lib/domain/route-planning";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantClusterJson = {
  index: number;
  centroid: { lat: number; lng: number };
  ordered_asset_ids: string[];
  member_count: number;
};

export function clustersToJson(clustersOrdered: RoutePoint[][]): TenantClusterJson[] {
  return clustersOrdered.map((pts, index) => ({
    index,
    centroid: centroidOfPoints(pts),
    ordered_asset_ids: pts.map((p) => p.elevator_asset_id),
    member_count: pts.length,
  }));
}

export async function upsertTenantClusterState(
  tenantId: string,
  radiusKm: number,
  clusters: TenantClusterJson[],
  routeSupabase?: SupabaseClient | null,
): Promise<void> {
  if (process.env.DATABASE_URL?.trim()) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO tenant_route_cluster_state (tenant_id, radius_km, clusters, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (tenant_id) DO UPDATE SET
         radius_km = EXCLUDED.radius_km,
         clusters = EXCLUDED.clusters,
         updated_at = now()`,
      [tenantId, radiusKm, JSON.stringify(clusters)],
    );
    return;
  }
  if (isSupabaseConfigured()) {
    const supabase = routeSupabase ?? (await createClient());
    if (!supabase) return;
    const { error } = await supabase.from("tenant_route_cluster_state").upsert(
      {
        tenant_id: tenantId,
        radius_km: radiusKm,
        clusters,
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
  }
}

export async function getTenantClusterState(
  tenantId: string,
): Promise<{ radius_km: number; clusters: TenantClusterJson[]; updated_at: string | null } | null> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const pool = getPool();
      const { rows } = await pool.query<{
        radius_km: string;
        clusters: unknown;
        updated_at: Date | null;
      }>(
        `SELECT radius_km::text, clusters, updated_at FROM tenant_route_cluster_state WHERE tenant_id = $1`,
        [tenantId],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        radius_km: Number.parseFloat(r.radius_km),
        clusters: (r.clusters as TenantClusterJson[]) ?? [],
        updated_at: r.updated_at ? r.updated_at.toISOString() : null,
      };
    } catch {
      /* supabase */
    }
  }
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("tenant_route_cluster_state")
      .select("radius_km, clusters, updated_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!data) return null;
    return {
      radius_km: Number(data.radius_km ?? 2),
      clusters: (data.clusters as TenantClusterJson[]) ?? [],
      updated_at: data.updated_at ? String(data.updated_at) : null,
    };
  }
  const pool = getPool();
  const { rows } = await pool.query<{
    radius_km: string;
    clusters: unknown;
    updated_at: string | null;
  }>(
    `SELECT radius_km::text, clusters, updated_at::text FROM tenant_route_cluster_state WHERE tenant_id = $1`,
    [tenantId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    radius_km: Number.parseFloat(r.radius_km),
    clusters: (r.clusters as TenantClusterJson[]) ?? [],
    updated_at: r.updated_at,
  };
}
