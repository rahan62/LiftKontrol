import { getPool } from "@/lib/db/pool";

export type ProjectRow = {
  id: string;
  name: string;
  project_type: string;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  customer_name: string | null;
  site_name: string | null;
  spec_file_path: string | null;
};

export async function listProjects(tenantId: string): Promise<ProjectRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ProjectRow>(
    `SELECT p.id, p.name, p.project_type, p.status,
            p.planned_start::text AS planned_start, p.planned_end::text AS planned_end,
            c.legal_name AS customer_name, s.name AS site_name, p.spec_file_path
     FROM projects p
     JOIN customers c ON c.id = p.customer_id AND c.tenant_id = p.tenant_id
     JOIN sites s ON s.id = p.site_id AND s.tenant_id = p.tenant_id
     WHERE p.tenant_id = $1
     ORDER BY p.created_at DESC`,
    [tenantId],
  );
  return rows;
}

export async function listProjectOptions(tenantId: string): Promise<{ id: string; name: string }[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM projects WHERE tenant_id = $1 ORDER BY name`,
    [tenantId],
  );
  return rows;
}

export async function assertSiteBelongsToCustomer(
  tenantId: string,
  siteId: string,
  customerId: string,
): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query<{ ok: boolean }>(
    `SELECT true AS ok FROM sites
     WHERE tenant_id = $1 AND id = $2 AND customer_id = $3`,
    [tenantId, siteId, customerId],
  );
  return Boolean(rows[0]?.ok);
}
