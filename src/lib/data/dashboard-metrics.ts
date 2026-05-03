import { getPool } from "@/lib/db/pool";

export const DASHBOARD_METRIC_SLUGS = [
  "maintenance-expected",
  "maintenance-covered",
  "revenue",
  "failures",
  "failures-open",
  "periodic-upcoming",
] as const;

export type DashboardMetricSlug = (typeof DASHBOARD_METRIC_SLUGS)[number];

export function isDashboardMetricSlug(s: string): s is DashboardMetricSlug {
  return (DASHBOARD_METRIC_SLUGS as readonly string[]).includes(s);
}

export type DashboardMetricTotals = {
  maintenanceExpectedSlots: number;
  maintenanceCoveredCount: number;
  revenueByCurrency: { currency: string; sum: number }[];
  failuresCreatedCount: number;
  failuresUnsolvedCount: number;
  periodicDueCount: number;
};

export async function getDashboardMetricTotals(
  tenantId: string,
  fromISO: string,
  toISO: string,
): Promise<DashboardMetricTotals> {
  const pool = getPool();
  const [expected, covered, revenueRows, failures, failuresOpen, periodic] = await Promise.all([
    pool.query<{ c: string }>(
      `WITH months AS (
          SELECT generate_series(
            date_trunc('month', $2::date)::date,
            date_trunc('month', $3::date)::date,
            interval '1 month'
          )::date AS ym
        ),
        eligible AS (
          SELECT ea.id FROM elevator_assets ea
          WHERE ea.tenant_id = $1::uuid
          AND COALESCE(ea.operational_status, '') <> 'decommissioned'
        )
       SELECT count(*)::text AS c FROM eligible CROSS JOIN months`,
      [tenantId, fromISO, toISO],
    ),
    pool.query<{ c: string }>(
      `SELECT count(*)::text AS c
       FROM elevator_monthly_maintenance emm
       WHERE emm.tenant_id = $1::uuid
       AND (emm.completed_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date`,
      [tenantId, fromISO, toISO],
    ),
    pool.query<{ currency: string; s: string }>(
      `SELECT currency, SUM(amount)::text AS s
       FROM finance_entries fe
       WHERE fe.tenant_id = $1::uuid
       AND fe.entry_type = 'payment'
       AND fe.occurred_on BETWEEN $2::date AND $3::date
       GROUP BY fe.currency
       ORDER BY fe.currency ASC`,
      [tenantId, fromISO, toISO],
    ),
    pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM work_orders wo
       WHERE wo.tenant_id = $1::uuid
       AND wo.work_type = 'emergency_breakdown'
       AND (wo.created_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date`,
      [tenantId, fromISO, toISO],
    ),
    pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM work_orders wo
       WHERE wo.tenant_id = $1::uuid
       AND wo.work_type = 'emergency_breakdown'
       AND (wo.created_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date
       AND wo.status NOT IN ('completed','cancelled')`,
      [tenantId, fromISO, toISO],
    ),
    pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM elevator_assets ea
       WHERE ea.tenant_id = $1::uuid
       AND ea.en8120_next_control_due IS NOT NULL
       AND ea.en8120_next_control_due >= $2::date
       AND ea.en8120_next_control_due <= $3::date`,
      [tenantId, fromISO, toISO],
    ),
  ]);

  const revenueByCurrency = revenueRows.rows.map((r) => ({
    currency: r.currency?.trim() || "TRY",
    sum: Number.parseFloat(r.s || "0") || 0,
  }));

  return {
    maintenanceExpectedSlots: Number.parseInt(expected.rows[0]?.c ?? "0", 10) || 0,
    maintenanceCoveredCount: Number.parseInt(covered.rows[0]?.c ?? "0", 10) || 0,
    revenueByCurrency,
    failuresCreatedCount: Number.parseInt(failures.rows[0]?.c ?? "0", 10) || 0,
    failuresUnsolvedCount: Number.parseInt(failuresOpen.rows[0]?.c ?? "0", 10) || 0,
    periodicDueCount: Number.parseInt(periodic.rows[0]?.c ?? "0", 10) || 0,
  };
}

export type MaintenanceExpectedRow = {
  asset_id: string;
  unit_code: string;
  site_name: string | null;
  customer_name: string | null;
  due_month: string;
};

export async function listDashboardMaintenanceExpected(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<MaintenanceExpectedRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<MaintenanceExpectedRow>(
    `WITH months AS (
        SELECT generate_series(
          date_trunc('month', $2::date)::date,
          date_trunc('month', $3::date)::date,
          interval '1 month'
        )::date AS ym
      ),
      eligible AS (
        SELECT ea.id, ea.unit_code, s.name AS site_name, c.legal_name AS customer_name
        FROM elevator_assets ea
        INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
        INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
        WHERE ea.tenant_id = $1::uuid
        AND COALESCE(ea.operational_status, '') <> 'decommissioned'
      )
     SELECT e.id AS asset_id,
            e.unit_code,
            e.site_name,
            e.customer_name,
            to_char(m.ym, 'YYYY-MM-DD') AS due_month
     FROM eligible e CROSS JOIN months m
     ORDER BY m.ym ASC, e.unit_code ASC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
  );
  return rows;
}

export type MaintenanceCoveredRow = {
  id: string;
  completed_at: string;
  year_month: string;
  unit_code: string;
  site_name: string | null;
  customer_name: string | null;
};

export async function listDashboardMaintenanceCovered(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<MaintenanceCoveredRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<MaintenanceCoveredRow>(
    `SELECT emm.id::text,
            emm.completed_at::text,
            emm.year_month::text,
            ea.unit_code,
            s.name AS site_name,
            c.legal_name AS customer_name
     FROM elevator_monthly_maintenance emm
     INNER JOIN elevator_assets ea ON ea.id = emm.elevator_asset_id AND ea.tenant_id = emm.tenant_id
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE emm.tenant_id = $1::uuid
     AND (emm.completed_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date
     ORDER BY emm.completed_at DESC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
  );
  return rows;
}

export type RevenuePaymentRow = {
  id: string;
  amount: string;
  currency: string;
  label: string;
  occurred_on: string;
  unit_code: string | null;
};

export async function listDashboardRevenuePayments(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<RevenuePaymentRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<RevenuePaymentRow>(
    `SELECT fe.id::text,
            fe.amount::text,
            fe.currency,
            fe.label,
            fe.occurred_on::text,
            ea.unit_code
     FROM finance_entries fe
     LEFT JOIN elevator_assets ea ON ea.id = fe.elevator_asset_id AND ea.tenant_id = fe.tenant_id
     WHERE fe.tenant_id = $1::uuid
     AND fe.entry_type = 'payment'
     AND fe.occurred_on BETWEEN $2::date AND $3::date
     ORDER BY fe.occurred_on DESC, fe.created_at DESC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
  );
  return rows;
}

export type FailureWorkOrderRow = {
  id: string;
  number: string;
  status: string;
  created_at: string;
  unit_code: string | null;
  site_name: string | null;
};

export async function listDashboardFailures(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<FailureWorkOrderRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<FailureWorkOrderRow>(
    `SELECT wo.id::text,
            wo.number,
            wo.status,
            wo.created_at::text,
            ea.unit_code,
            s.name AS site_name
     FROM work_orders wo
     LEFT JOIN elevator_assets ea ON ea.id = wo.elevator_asset_id AND ea.tenant_id = wo.tenant_id
     LEFT JOIN sites s ON s.id = wo.site_id AND s.tenant_id = wo.tenant_id
     WHERE wo.tenant_id = $1::uuid
     AND wo.work_type = 'emergency_breakdown'
     AND (wo.created_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date
     ORDER BY wo.created_at DESC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
  );
  return rows;
}

export async function listDashboardFailuresOpen(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<FailureWorkOrderRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<FailureWorkOrderRow>(
    `SELECT wo.id::text,
            wo.number,
            wo.status,
            wo.created_at::text,
            ea.unit_code,
            s.name AS site_name
     FROM work_orders wo
     LEFT JOIN elevator_assets ea ON ea.id = wo.elevator_asset_id AND ea.tenant_id = wo.tenant_id
     LEFT JOIN sites s ON s.id = wo.site_id AND s.tenant_id = wo.tenant_id
     WHERE wo.tenant_id = $1::uuid
     AND wo.work_type = 'emergency_breakdown'
     AND (wo.created_at AT TIME ZONE 'UTC')::date BETWEEN $2::date AND $3::date
     AND wo.status NOT IN ('completed','cancelled')
     ORDER BY wo.created_at DESC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
  );
  return rows;
}

export type PeriodicDueRow = {
  asset_id: string;
  unit_code: string;
  site_name: string | null;
  customer_name: string | null;
  next_control_due: string;
  days_until_due: number;
};

export async function listDashboardPeriodicUpcoming(
  tenantId: string,
  fromISO: string,
  toISO: string,
  limit = 500,
): Promise<PeriodicDueRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    asset_id: string;
    unit_code: string;
    site_name: string | null;
    customer_name: string | null;
    next_control_due: string;
    days_until_due: string;
  }>(
    `SELECT ea.id::text AS asset_id,
            ea.unit_code,
            s.name AS site_name,
            c.legal_name AS customer_name,
            ea.en8120_next_control_due::text AS next_control_due,
            (ea.en8120_next_control_due - CURRENT_DATE)::int::text AS days_until_due
     FROM elevator_assets ea
     INNER JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1::uuid
     AND ea.en8120_next_control_due IS NOT NULL
     AND ea.en8120_next_control_due >= $2::date
     AND ea.en8120_next_control_due <= $3::date
     ORDER BY ea.en8120_next_control_due ASC, ea.unit_code ASC
     LIMIT $4`,
    [tenantId, fromISO, toISO, limit],
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
