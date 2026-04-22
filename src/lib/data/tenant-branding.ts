import { getPool } from "@/lib/db/pool";

export async function getTenantBranding(tenantId: string): Promise<{ name: string; logo_path: string | null } | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ name: string; logo_path: string | null }>(
    `SELECT name, logo_path FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const r = rows[0];
  if (!r) return null;
  return { name: r.name, logo_path: r.logo_path };
}

export async function setTenantLogoPath(tenantId: string, logoPath: string | null): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE tenants SET logo_path = $2 WHERE id = $1`, [tenantId, logoPath]);
}
