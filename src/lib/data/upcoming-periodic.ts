import { getPool } from "@/lib/db/pool";

export type UpcomingPeriodicRow = {
  asset_id: string;
  unit_code: string;
  site_name: string | null;
  customer_name: string | null;
  next_control_due: string;
  days_until_due: number;
};

/**
 * Elevators with next periodic control due within the next `withinDays` calendar days (inclusive of today).
 * Uses elevator_assets.en8120_next_control_due.
 */
export async function listUpcomingPeriodicControls(
  tenantId: string,
  withinDays: number,
): Promise<UpcomingPeriodicRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    asset_id: string;
    unit_code: string;
    site_name: string | null;
    customer_name: string | null;
    next_control_due: string;
    days_until_due: string;
  }>(
    `SELECT ea.id AS asset_id,
            ea.unit_code,
            s.name AS site_name,
            c.legal_name AS customer_name,
            ea.en8120_next_control_due::text AS next_control_due,
            (ea.en8120_next_control_due - CURRENT_DATE)::int AS days_until_due
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1
       AND ea.en8120_next_control_due IS NOT NULL
       AND ea.en8120_next_control_due >= CURRENT_DATE
       AND ea.en8120_next_control_due <= CURRENT_DATE + ($2::int * interval '1 day')
     ORDER BY ea.en8120_next_control_due ASC, ea.unit_code ASC`,
    [tenantId, withinDays],
  );
  return rows.map((r) => ({
    asset_id: r.asset_id,
    unit_code: r.unit_code,
    site_name: r.site_name,
    customer_name: r.customer_name,
    next_control_due: r.next_control_due,
    days_until_due: Number.parseInt(r.days_until_due, 10),
  }));
}
