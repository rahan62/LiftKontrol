import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type DashboardCounts = {
  customerCount: number;
  contractCount: number;
  assetCount: number;
  workOrderCount: number;
  openBreakdowns: number;
  openCallbacks: number;
};

export async function getDashboardCounts(tenantId: string): Promise<DashboardCounts> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) {
      return emptyCounts();
    }
    const [c, ct, a, w, b, cb] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("elevator_assets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("work_type", "emergency_breakdown")
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled"),
      supabase.from("callbacks").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    ]);
    return {
      customerCount: c.count ?? 0,
      contractCount: ct.count ?? 0,
      assetCount: a.count ?? 0,
      workOrderCount: w.count ?? 0,
      openBreakdowns: b.count ?? 0,
      openCallbacks: cb.count ?? 0,
    };
  }

  const pool = getPool();
  const [c, ct, a, w, b, cb] = await Promise.all([
    pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM customers WHERE tenant_id = $1`, [tenantId]),
    pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM contracts WHERE tenant_id = $1`, [tenantId]),
    pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM elevator_assets WHERE tenant_id = $1`, [tenantId]),
    pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM work_orders WHERE tenant_id = $1`, [tenantId]),
    pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM work_orders WHERE tenant_id = $1
       AND work_type = 'emergency_breakdown' AND status NOT IN ('completed','cancelled')`,
      [tenantId],
    ),
    pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM callbacks WHERE tenant_id = $1`, [tenantId]),
  ]);
  return {
    customerCount: Number(c.rows[0]?.c ?? 0),
    contractCount: Number(ct.rows[0]?.c ?? 0),
    assetCount: Number(a.rows[0]?.c ?? 0),
    workOrderCount: Number(w.rows[0]?.c ?? 0),
    openBreakdowns: Number(b.rows[0]?.c ?? 0),
    openCallbacks: Number(cb.rows[0]?.c ?? 0),
  };
}

function emptyCounts(): DashboardCounts {
  return {
    customerCount: 0,
    contractCount: 0,
    assetCount: 0,
    workOrderCount: 0,
    openBreakdowns: 0,
    openCallbacks: 0,
  };
}
