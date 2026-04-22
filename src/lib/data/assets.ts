import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type AssetRow = {
  id: string;
  unit_code: string;
  brand: string | null;
  model: string | null;
  operational_status: string;
  unsafe_flag: boolean;
  site_id: string;
  site_name: string | null;
  qr_payload: string | null;
  maintenance_fee: number | null;
  maintenance_fee_period: string | null;
};

export type AssetOptionRow = { id: string; unit_code: string; site_name: string };

/** Elevators with site name for finance / pickers (requires DATABASE_URL). */
export async function listAssetOptions(tenantId: string): Promise<AssetOptionRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<AssetOptionRow>(
    `SELECT ea.id, ea.unit_code, s.name AS site_name
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1
     ORDER BY s.name, ea.unit_code`,
    [tenantId],
  );
  return rows;
}

export type AssetOptionWithSiteRow = AssetOptionRow & { site_id: string };

export async function listAssetOptionsWithSite(tenantId: string): Promise<AssetOptionWithSiteRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("elevator_assets")
      .select("id, unit_code, site_id, sites(name)")
      .eq("tenant_id", tenantId)
      .order("unit_code");
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const sites = row.sites as { name?: string } | null;
      return {
        id: row.id as string,
        unit_code: row.unit_code as string,
        site_id: row.site_id as string,
        site_name: sites?.name ?? "",
      };
    });
  }
  const pool = getPool();
  const { rows } = await pool.query<AssetOptionWithSiteRow>(
    `SELECT ea.id, ea.unit_code, ea.site_id, s.name AS site_name
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1
     ORDER BY s.name, ea.unit_code`,
    [tenantId],
  );
  return rows;
}

function mapSupabaseAssetRow(r: Record<string, unknown>): AssetRow {
  const sites = r.sites as { name?: string } | { name?: string }[] | null | undefined;
  const siteName = Array.isArray(sites) ? sites[0]?.name : sites?.name;
  const feeRaw = r.maintenance_fee;
  const feeNum = feeRaw !== null && feeRaw !== undefined ? Number(feeRaw) : NaN;
  return {
    id: r.id as string,
    unit_code: r.unit_code as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    operational_status: r.operational_status as string,
    unsafe_flag: Boolean(r.unsafe_flag),
    site_id: r.site_id as string,
    site_name: siteName ?? null,
    qr_payload: (r.qr_payload as string | null) ?? null,
    maintenance_fee: Number.isFinite(feeNum) ? feeNum : null,
    maintenance_fee_period: (r.maintenance_fee_period as string | null) ?? null,
  };
}

export async function listAssets(tenantId: string): Promise<AssetRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("elevator_assets")
      .select(
        "id, unit_code, brand, model, operational_status, unsafe_flag, site_id, qr_payload, maintenance_fee, maintenance_fee_period, sites(name)",
      )
      .eq("tenant_id", tenantId)
      .order("unit_code");
    return (data ?? []).map((row) => mapSupabaseAssetRow(row as Record<string, unknown>));
  }
  const pool = getPool();
  const { rows } = await pool.query<AssetRow>(
    `SELECT ea.id, ea.unit_code, ea.brand, ea.model, ea.operational_status, ea.unsafe_flag, ea.site_id,
            ea.qr_payload, ea.maintenance_fee::float8 AS maintenance_fee, ea.maintenance_fee_period,
            s.name AS site_name
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1
     ORDER BY s.name, ea.unit_code`,
    [tenantId],
  );
  return rows;
}

/** Elevators registered on a single site (same rows as listAssets, filtered). */
export async function listAssetsForSite(tenantId: string, siteId: string): Promise<AssetRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("elevator_assets")
      .select(
        "id, unit_code, brand, model, operational_status, unsafe_flag, site_id, qr_payload, maintenance_fee, maintenance_fee_period, sites(name)",
      )
      .eq("tenant_id", tenantId)
      .eq("site_id", siteId)
      .order("unit_code");
    return (data ?? []).map((row) => mapSupabaseAssetRow(row as Record<string, unknown>));
  }
  const pool = getPool();
  const { rows } = await pool.query<AssetRow>(
    `SELECT ea.id, ea.unit_code, ea.brand, ea.model, ea.operational_status, ea.unsafe_flag, ea.site_id,
            ea.qr_payload, ea.maintenance_fee::float8 AS maintenance_fee, ea.maintenance_fee_period,
            s.name AS site_name
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1 AND ea.site_id = $2
     ORDER BY ea.unit_code`,
    [tenantId, siteId],
  );
  return rows;
}

export async function getAssetWithSiteCustomer(
  tenantId: string,
  id: string,
): Promise<{
  asset: Record<string, unknown>;
  siteName: string | null;
  customerName: string | null;
} | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: asset } = await supabase
      .from("elevator_assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (!asset) return null;
    const { data: site } = await supabase
      .from("sites")
      .select("name")
      .eq("id", asset.site_id as string)
      .maybeSingle();
    const { data: customer } = await supabase
      .from("customers")
      .select("legal_name")
      .eq("id", asset.customer_id as string)
      .maybeSingle();
    return {
      asset: asset as Record<string, unknown>,
      siteName: site?.name ?? null,
      customerName: customer?.legal_name ?? null,
    };
  }
  const pool = getPool();
  const { rows: arows } = await pool.query(`SELECT * FROM elevator_assets WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    id,
  ]);
  const asset = arows[0] as Record<string, unknown> | undefined;
  if (!asset) return null;
  const siteId = asset.site_id as string;
  const customerId = asset.customer_id as string;
  const { rows: srows } = await pool.query<{ name: string }>(`SELECT name FROM sites WHERE id = $1`, [siteId]);
  const { rows: crows } = await pool.query<{ legal_name: string }>(
    `SELECT legal_name FROM customers WHERE id = $1`,
    [customerId],
  );
  return {
    asset,
    siteName: srows[0]?.name ?? null,
    customerName: crows[0]?.legal_name ?? null,
  };
}

export async function getElevatorUnitCode(tenantId: string, assetId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("elevator_assets")
      .select("unit_code")
      .eq("tenant_id", tenantId)
      .eq("id", assetId)
      .maybeSingle();
    const code = data?.unit_code;
    return code != null ? String(code) : null;
  }
  const pool = getPool();
  const { rows } = await pool.query<{ unit_code: string }>(
    `SELECT unit_code FROM elevator_assets WHERE tenant_id = $1 AND id = $2`,
    [tenantId, assetId],
  );
  return rows[0]?.unit_code ?? null;
}
