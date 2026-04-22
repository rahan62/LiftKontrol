import { getOrCreateMainWarehouseLocationIdTx } from "@/lib/data/stock-locations";
import { getPool } from "@/lib/db/pool";
import { randomUUID } from "node:crypto";

export type WorkType = "maintenance" | "revision" | "repair" | "assembly";

const WORK_LABEL_TR: Record<WorkType, string> = {
  maintenance: "Bakım",
  revision: "Revizyon",
  repair: "Onarım",
  assembly: "Montaj",
};

export type PartsLine = {
  stock_item_id: string;
  qty: number;
  unit_price: number;
};

export async function recordPartsUsageBatch(
  tenantId: string,
  input: {
    elevator_asset_id: string;
    site_id: string;
    work_type: WorkType;
    lines: PartsLine[];
    monthly_maintenance_id: string | null;
    work_order_id: string | null;
    unit_code: string;
  },
): Promise<{ ok: true; batchId: string; financeId: string } | { ok: false; error: string }> {
  if (!input.lines.length) {
    return { ok: false, error: "En az bir parça satırı gerekli" };
  }

  const pool = getPool();
  const client = await pool.connect();
  const batchId = randomUUID();

  try {
    await client.query("BEGIN");

    const { rows: assetRows } = await client.query<{ site_id: string }>(
      `SELECT site_id FROM elevator_assets WHERE tenant_id = $1 AND id = $2`,
      [tenantId, input.elevator_asset_id],
    );
    if (!assetRows[0] || assetRows[0].site_id !== input.site_id) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Asansör ve saha eşleşmiyor" };
    }

    if (input.work_order_id) {
      const { rows: woRows } = await client.query<{ id: string }>(
        `SELECT id FROM work_orders
         WHERE tenant_id = $1 AND id = $2 AND elevator_asset_id = $3
           AND status NOT IN ('completed', 'cancelled')`,
        [tenantId, input.work_order_id, input.elevator_asset_id],
      );
      if (!woRows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, error: "Geçersiz veya kapalı iş emri" };
      }
    }

    let total = 0;
    for (const line of input.lines) {
      total += line.qty * line.unit_price;
    }
    if (total <= 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Tutar sıfırdan büyük olmalı" };
    }

    const locationId = await getOrCreateMainWarehouseLocationIdTx(client, tenantId);

    for (const line of input.lines) {
      const { rows: bal } = await client.query<{ qty: string }>(
        `SELECT COALESCE(sb.qty_on_hand, 0)::text AS qty
         FROM stock_balances sb
         WHERE sb.tenant_id = $1 AND sb.stock_item_id = $2 AND sb.location_id = $3`,
        [tenantId, line.stock_item_id, locationId],
      );
      const onHand = bal[0] ? Number.parseFloat(bal[0].qty) : 0;
      if (!Number.isFinite(onHand) || onHand < line.qty) {
        await client.query("ROLLBACK");
        return { ok: false, error: `Yetersiz stok (SKU yetersiz veya bakiye yok)` };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const label = `Parça kullanımı — ${WORK_LABEL_TR[input.work_type]} — ${input.unit_code}`;
    const woPart = input.work_order_id ? `\nwork_order_id:${input.work_order_id}` : "";
    const finNotes = `AUTO_PARTS_BATCH:${batchId}\nOtomatik: parça çıkışı (stok düşümü).${woPart}`;

    const { rows: finRows } = await client.query<{ id: string }>(
      `INSERT INTO finance_entries (
         tenant_id, site_id, elevator_asset_id, entry_type, amount, currency, label, notes, occurred_on, payment_status
       ) VALUES ($1, NULL, $2, 'fee', $3, 'TRY', $4, $5, $6::date, 'unpaid')
       RETURNING id`,
      [tenantId, input.elevator_asset_id, total, label, finNotes, today],
    );
    const financeId = finRows[0]?.id;
    if (!financeId) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Finans kaydı oluşturulamadı" };
    }

    for (const line of input.lines) {
      await client.query(
        `INSERT INTO stock_balances (tenant_id, stock_item_id, location_id, qty_on_hand)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (tenant_id, stock_item_id, location_id) DO NOTHING`,
        [tenantId, line.stock_item_id, locationId],
      );

      await client.query(
        `UPDATE stock_balances
         SET qty_on_hand = qty_on_hand - $4
         WHERE tenant_id = $1 AND stock_item_id = $2 AND location_id = $3`,
        [tenantId, line.stock_item_id, locationId, line.qty],
      );

      await client.query(
        `INSERT INTO stock_movements (
           tenant_id, movement_type, stock_item_id, qty, from_location_id, to_location_id,
           unit_cost, note, elevator_asset_id, parts_usage_batch_id
         ) VALUES ($1, 'issue', $2, $3, $4, NULL, $5, $6, $7, $8)`,
        [
          tenantId,
          line.stock_item_id,
          line.qty,
          locationId,
          line.unit_price,
          `Parça kullanımı ${batchId}`,
          input.elevator_asset_id,
          batchId,
        ],
      );

      await client.query(
        `INSERT INTO service_parts_usage (
           tenant_id, batch_id, elevator_asset_id, site_id, stock_item_id, qty, unit_price, work_type, monthly_maintenance_id, finance_entry_id, work_order_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          tenantId,
          batchId,
          input.elevator_asset_id,
          input.site_id,
          line.stock_item_id,
          line.qty,
          line.unit_price,
          input.work_type,
          input.monthly_maintenance_id,
          financeId,
          input.work_order_id,
        ],
      );
    }

    await client.query("COMMIT");
    return { ok: true, batchId, financeId };
  } catch (e) {
    await client.query("ROLLBACK");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Parça kaydı başarısız",
    };
  } finally {
    client.release();
  }
}
