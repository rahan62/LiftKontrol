import { getPool } from "@/lib/db/pool";
import type { ElevatorMonthRow } from "@/lib/domain/maintenance-month";

export type { ElevatorMonthRow } from "@/lib/domain/maintenance-month";
export { firstDayOfMonth } from "@/lib/domain/maintenance-month";

function normalizeChecklist(v: unknown): Record<string, string> | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(o)) {
    if (typeof val === "string") out[k] = val;
  }
  return Object.keys(out).length ? out : null;
}

export async function listElevatorMonthOverview(
  tenantId: string,
  yearMonth: string,
): Promise<ElevatorMonthRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    asset_id: string;
    unit_code: string;
    site_id: string;
    site_name: string;
    customer_name: string;
    maintenance_id: string | null;
    completed_at: string | null;
    notes: string | null;
    monthly_checklist: unknown;
  }>(
    `SELECT ea.id AS asset_id,
            ea.unit_code,
            s.id AS site_id,
            s.name AS site_name,
            c.legal_name AS customer_name,
            emm.id AS maintenance_id,
            emm.completed_at::text AS completed_at,
            emm.notes,
            emm.monthly_checklist
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     LEFT JOIN elevator_monthly_maintenance emm
       ON emm.elevator_asset_id = ea.id
      AND emm.tenant_id = ea.tenant_id
      AND emm.year_month = $2::date
     WHERE ea.tenant_id = $1
     ORDER BY c.legal_name, s.name, ea.unit_code`,
    [tenantId, yearMonth],
  );
  return rows.map((r) => ({
    asset_id: r.asset_id,
    unit_code: r.unit_code,
    site_id: r.site_id,
    site_name: r.site_name,
    customer_name: r.customer_name,
    maintenance_id: r.maintenance_id,
    completed_at: r.completed_at,
    notes: r.notes,
    monthly_checklist: normalizeChecklist(r.monthly_checklist),
  }));
}
