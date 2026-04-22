import { getPool } from "@/lib/db/pool";

export type FinanceEntryRow = {
  id: string;
  site_id: string | null;
  elevator_asset_id: string | null;
  entry_type: string;
  amount: string;
  currency: string;
  label: string;
  notes: string | null;
  occurred_on: string;
  created_at: string;
  payment_status: string;
  scope_label: string;
};

const baseFrom = `
  FROM finance_entries fe
  LEFT JOIN sites s ON s.id = fe.site_id AND s.tenant_id = fe.tenant_id
  LEFT JOIN elevator_assets ea ON ea.id = fe.elevator_asset_id AND ea.tenant_id = fe.tenant_id
  LEFT JOIN sites sa ON sa.id = ea.site_id AND sa.tenant_id = fe.tenant_id
`;

const selectCols = `
  SELECT fe.id,
         fe.site_id,
         fe.elevator_asset_id,
         fe.entry_type,
         fe.amount::text AS amount,
         fe.currency,
         fe.label,
         fe.notes,
         fe.occurred_on::text AS occurred_on,
         fe.created_at::text AS created_at,
         fe.payment_status,
         CASE
           WHEN fe.site_id IS NOT NULL THEN COALESCE(s.name, 'Site')
           WHEN fe.elevator_asset_id IS NOT NULL THEN
             COALESCE(ea.unit_code, 'Unit') || ' · ' || COALESCE(sa.name, 'Site')
           ELSE '—'
         END AS scope_label
`;

export async function listFinanceEntries(tenantId: string): Promise<FinanceEntryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId],
  );
  return rows;
}

export async function listFinanceEntriesForSite(
  tenantId: string,
  siteId: string,
): Promise<FinanceEntryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 AND fe.site_id = $2 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId, siteId],
  );
  return rows;
}

export async function listFinanceEntriesForAsset(
  tenantId: string,
  assetId: string,
): Promise<FinanceEntryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 AND fe.elevator_asset_id = $2 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId, assetId],
  );
  return rows;
}
