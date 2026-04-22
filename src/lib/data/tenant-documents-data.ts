import { getPool } from "@/lib/db/pool";

export type TenantDocumentRow = {
  id: string;
  title: string;
  description: string | null;
  stored_path: string;
  original_filename: string | null;
  created_at: string;
  customer_name: string | null;
  site_name: string | null;
  project_name: string | null;
};

export async function listTenantDocuments(tenantId: string): Promise<TenantDocumentRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<TenantDocumentRow>(
    `SELECT d.id, d.title, d.description, d.stored_path, d.original_filename,
            d.created_at::text AS created_at,
            c.legal_name AS customer_name,
            s.name AS site_name,
            p.name AS project_name
     FROM tenant_documents d
     LEFT JOIN customers c ON c.id = d.customer_id AND c.tenant_id = d.tenant_id
     LEFT JOIN sites s ON s.id = d.site_id AND s.tenant_id = d.tenant_id
     LEFT JOIN projects p ON p.id = d.project_id AND p.tenant_id = d.tenant_id
     WHERE d.tenant_id = $1
     ORDER BY d.created_at DESC`,
    [tenantId],
  );
  return rows;
}
