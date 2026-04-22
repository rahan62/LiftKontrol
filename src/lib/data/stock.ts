import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type StockItemRow = {
  id: string;
  sku: string;
  description: string;
  uom: string;
  min_qty: string | null;
  max_qty: string | null;
  subsystem: string | null;
  part_category: string | null;
  manufacturer: string | null;
  oem_part_number: string | null;
};

export async function listStockItems(tenantId: string, limit = 100): Promise<StockItemRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("stock_items")
      .select(
        "id, sku, description, uom, min_qty, max_qty, subsystem, part_category, manufacturer, oem_part_number",
      )
      .eq("tenant_id", tenantId)
      .order("sku")
      .limit(limit);
    return (data ?? []) as StockItemRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<StockItemRow>(
    `SELECT id, sku, description, uom,
            min_qty::text, max_qty::text,
            subsystem, part_category, manufacturer, oem_part_number
     FROM stock_items WHERE tenant_id = $1 ORDER BY sku LIMIT $2`,
    [tenantId, limit],
  );
  return rows;
}
