import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type SiteRow = {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string | null;
  updated_at: string;
};

export async function listSites(tenantId: string): Promise<SiteRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: sites } = await supabase
      .from("sites")
      .select("id, name, customer_id, updated_at")
      .eq("tenant_id", tenantId)
      .order("name");
    if (!sites?.length) return [];
    const custIds = [...new Set(sites.map((s) => s.customer_id))];
    const { data: customers } = await supabase
      .from("customers")
      .select("id, legal_name")
      .eq("tenant_id", tenantId)
      .in("id", custIds);
    const map = new Map((customers ?? []).map((c) => [c.id, c.legal_name as string]));
    return sites.map((s) => ({
      id: s.id,
      name: s.name,
      customer_id: s.customer_id,
      customer_name: map.get(s.customer_id) ?? null,
      updated_at: String(s.updated_at ?? ""),
    }));
  }
  const pool = getPool();
  const { rows } = await pool.query<SiteRow>(
    `SELECT s.id, s.name, s.customer_id, c.legal_name AS customer_name,
            s.updated_at::text
     FROM sites s
     JOIN customers c ON c.id = s.customer_id AND c.tenant_id = s.tenant_id
     WHERE s.tenant_id = $1
     ORDER BY c.legal_name, s.name`,
    [tenantId],
  );
  return rows;
}

export async function listSitesForCustomer(
  tenantId: string,
  customerId: string,
): Promise<{ id: string; name: string }[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("sites")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("name");
    return data ?? [];
  }
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM sites WHERE tenant_id = $1 AND customer_id = $2 ORDER BY name`,
    [tenantId, customerId],
  );
  return rows;
}

export async function getSite(
  tenantId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    return data;
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM sites WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    id,
  ]);
  return rows[0] ?? null;
}
