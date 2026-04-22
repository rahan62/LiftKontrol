import { getPool } from "@/lib/db/pool";
import { revisionCompletionMarker } from "@/lib/data/revision-completion-finance";

export function revisionDownPaymentMarker(revisionId: string): string {
  return `REVISION_DOWNPAY:${revisionId}`;
}

/**
 * Sum fee/invoice amounts on this elevator that are explicitly tied to this revision (notes markers).
 */
export async function sumRevisionLinkedFinanceAmount(
  tenantId: string,
  revisionId: string,
  elevatorAssetId: string,
): Promise<number> {
  const pool = getPool();
  const mComplete = `%${revisionCompletionMarker(revisionId)}%`;
  const mDown = `%${revisionDownPaymentMarker(revisionId)}%`;
  const { rows } = await pool.query<{ s: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS s
     FROM finance_entries
     WHERE tenant_id = $1::uuid
       AND elevator_asset_id = $2::uuid
       AND entry_type IN ('fee', 'invoice')
       AND (notes LIKE $3 OR notes LIKE $4)`,
    [tenantId, elevatorAssetId, mComplete, mDown],
  );
  const n = Number.parseFloat(rows[0]?.s ?? "0");
  return Number.isFinite(n) ? n : 0;
}
