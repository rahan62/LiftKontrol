import { getOrCreateMainWarehouseLocationId } from "@/lib/data/stock-locations";
import { getPool } from "@/lib/db/pool";

export type StockItemInsertInput = {
  sku: string;
  description: string;
  uom?: string;
  min_qty?: number | null;
  max_qty?: number | null;
  part_category?: string | null;
  subsystem?: string | null;
  manufacturer?: string | null;
  oem_part_number?: string | null;
  compatibility_notes?: string | null;
  material_grade?: string | null;
  unit_cost?: number | null;
};

export async function insertStockItemRow(
  tenantId: string,
  input: StockItemInsertInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO stock_items (
         tenant_id, sku, description, uom, min_qty, max_qty,
         part_category, subsystem, manufacturer, oem_part_number, compatibility_notes, material_grade, unit_cost
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        tenantId,
        input.sku.trim(),
        input.description.trim(),
        input.uom?.trim() || "ad",
        input.min_qty ?? null,
        input.max_qty ?? null,
        input.part_category?.trim() || null,
        input.subsystem?.trim() || null,
        input.manufacturer?.trim() || null,
        input.oem_part_number?.trim() || null,
        input.compatibility_notes?.trim() || null,
        input.material_grade?.trim() || null,
        input.unit_cost ?? null,
      ],
    );
    if (!rows[0]) return { ok: false, error: "Kayıt eklenemedi" };
    const locId = await getOrCreateMainWarehouseLocationId(tenantId);
    await pool.query(
      `INSERT INTO stock_balances (tenant_id, stock_item_id, location_id, qty_on_hand)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (tenant_id, stock_item_id, location_id) DO NOTHING`,
      [tenantId, rows[0].id, locId],
    );
    return { ok: true, id: rows[0].id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stok hatası" };
  }
}
