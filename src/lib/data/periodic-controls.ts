import { getPool } from "@/lib/db/pool";

export type PeriodicControlRow = {
  id: string;
  elevator_asset_id: string;
  unit_code: string;
  site_name: string | null;
  control_date: string;
  issuer_name: string | null;
  notes: string | null;
  form_file_path: string;
  created_at: string;
};

export async function listPeriodicControls(tenantId: string): Promise<PeriodicControlRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<PeriodicControlRow>(
    `SELECT pc.id,
            pc.elevator_asset_id,
            ea.unit_code,
            s.name AS site_name,
            pc.control_date::text AS control_date,
            pc.issuer_name,
            pc.notes,
            pc.form_file_path,
            pc.created_at::text AS created_at
     FROM periodic_controls pc
     INNER JOIN elevator_assets ea ON ea.id = pc.elevator_asset_id AND ea.tenant_id = pc.tenant_id
     LEFT JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE pc.tenant_id = $1
     ORDER BY pc.control_date DESC, pc.created_at DESC`,
    [tenantId],
  );
  return rows;
}

export async function getPeriodicControl(
  tenantId: string,
  id: string,
): Promise<PeriodicControlRow & { customer_name: string | null } | null> {
  const pool = getPool();
  const { rows } = await pool.query<
    PeriodicControlRow & { customer_name: string | null }
  >(
    `SELECT pc.id,
            pc.elevator_asset_id,
            ea.unit_code,
            s.name AS site_name,
            pc.control_date::text AS control_date,
            pc.issuer_name,
            pc.notes,
            pc.form_file_path,
            pc.created_at::text AS created_at,
            c.legal_name AS customer_name
     FROM periodic_controls pc
     INNER JOIN elevator_assets ea ON ea.id = pc.elevator_asset_id AND ea.tenant_id = pc.tenant_id
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE pc.tenant_id = $1 AND pc.id = $2`,
    [tenantId, id],
  );
  return rows[0] ?? null;
}
