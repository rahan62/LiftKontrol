import type { PoolClient } from "pg";
import { getPool } from "@/lib/db/pool";

/** Primary warehouse for issues / receipts (creates "Ana depo" if none). */
export async function getOrCreateMainWarehouseLocationId(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM stock_locations WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  );
  if (rows[0]) return rows[0].id;
  const ins = await pool.query<{ id: string }>(
    `INSERT INTO stock_locations (tenant_id, location_type, label)
     VALUES ($1, 'warehouse', 'Ana depo')
     RETURNING id`,
    [tenantId],
  );
  if (!ins.rows[0]) throw new Error("Could not create warehouse");
  return ins.rows[0].id;
}

/** Same, using an open transaction client. */
export async function getOrCreateMainWarehouseLocationIdTx(
  client: PoolClient,
  tenantId: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM stock_locations WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  );
  if (rows[0]) return rows[0].id;
  const ins = await client.query<{ id: string }>(
    `INSERT INTO stock_locations (tenant_id, location_type, label)
     VALUES ($1, 'warehouse', 'Ana depo')
     RETURNING id`,
    [tenantId],
  );
  if (!ins.rows[0]) throw new Error("Could not create warehouse");
  return ins.rows[0].id;
}
