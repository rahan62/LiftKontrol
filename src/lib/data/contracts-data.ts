import { getPool } from "@/lib/db/pool";

export type ContractRow = {
  id: string;
  title: string;
  status: string;
  contract_type: string;
  start_at: string;
  end_at: string | null;
  counterparty_name: string | null;
  stored_file_path: string | null;
  recurring_price: string | null;
  maintenance_transfer_basis: string | null;
};

export async function listContracts(tenantId: string): Promise<ContractRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ContractRow>(
    `SELECT id, title, status, contract_type, start_at::text AS start_at, end_at::text AS end_at,
            counterparty_name, stored_file_path, recurring_price::text AS recurring_price,
            maintenance_transfer_basis
     FROM contracts WHERE tenant_id = $1 ORDER BY start_at DESC`,
    [tenantId],
  );
  return rows;
}
