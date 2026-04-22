import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type WorkOrderRow = {
  id: string;
  number: string;
  work_type: string;
  status: string;
  priority: string;
  is_emergency: boolean;
  elevator_asset_id: string | null;
};

export async function listWorkOrders(tenantId: string, limit = 50): Promise<WorkOrderRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("work_orders")
      .select("id, number, work_type, status, priority, is_emergency, elevator_asset_id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as WorkOrderRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<WorkOrderRow>(
    `SELECT id, number, work_type, status, priority, is_emergency, elevator_asset_id
     FROM work_orders WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit],
  );
  return rows;
}

export type OpenRepairWorkOrderRow = {
  id: string;
  number: string;
  elevator_asset_id: string | null;
};

/** Açık onarım / arıza iş emirleri (parça çıkışında bağlamak için). */
export async function listOpenRepairWorkOrdersForTenant(
  tenantId: string,
): Promise<OpenRepairWorkOrderRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("work_orders")
      .select("id, number, elevator_asset_id")
      .eq("tenant_id", tenantId)
      .in("work_type", ["repair", "emergency_breakdown"])
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return [];
    return (data ?? []) as OpenRepairWorkOrderRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<OpenRepairWorkOrderRow>(
    `SELECT id, number, elevator_asset_id FROM work_orders
     WHERE tenant_id = $1
       AND work_type IN ('repair', 'emergency_breakdown')
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC
     LIMIT 200`,
    [tenantId],
  );
  return rows;
}

export async function getWorkOrder(
  tenantId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("work_orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    return data;
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM work_orders WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    id,
  ]);
  return rows[0] ?? null;
}
