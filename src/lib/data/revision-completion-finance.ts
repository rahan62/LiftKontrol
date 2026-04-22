import type { TicketTier } from "@/lib/domain/en8120-tickets";
import { getPool } from "@/lib/db/pool";
import { insertFinanceEntry } from "@/lib/data/writes";
import { sumRevisionLinkedFinanceAmount } from "@/lib/data/revision-finance-helpers";

const TICKET_TR: Record<TicketTier, string> = {
  green: "Yeşil",
  blue: "Mavi",
  yellow: "Sarı",
  red: "Kırmızı",
};

/** Embedded in finance_entries.notes for idempotent auto rows per revision. */
export function revisionCompletionMarker(revisionId: string): string {
  return `AUTO_REVISION_COMPLETION:${revisionId}`;
}

/**
 * After final inspection, record **remaining** revision fee as one elevator-scoped row
 * (total teklif − peşinat ve önceki otomatik tamamlama satırları). Tek satır; idempotent.
 */
export async function maybeCreateRevisionCompletionFinance(
  tenantId: string,
  opts: {
    revisionId: string;
    elevatorAssetId: string;
    totalFeeTry: number;
    unitCode: string;
    finalTicket: TicketTier;
    occurredOn: string;
  },
): Promise<{ created: boolean; financeEntryId?: string }> {
  const pool = getPool();
  const marker = revisionCompletionMarker(opts.revisionId);

  const { rows: existing } = await pool.query<{ id: string }>(
    `SELECT id FROM finance_entries
     WHERE tenant_id = $1 AND notes LIKE $2
     LIMIT 1`,
    [tenantId, `%${marker}%`],
  );
  if (existing[0]) {
    return { created: false };
  }

  const total = opts.totalFeeTry;
  if (!Number.isFinite(total) || total <= 0) {
    return { created: false };
  }

  const already = await sumRevisionLinkedFinanceAmount(tenantId, opts.revisionId, opts.elevatorAssetId);
  const remaining = Math.max(0, total - already);
  if (remaining <= 0.009) {
    return { created: false };
  }

  const ticketLabel = TICKET_TR[opts.finalTicket];
  const result = await insertFinanceEntry(tenantId, {
    site_id: null,
    elevator_asset_id: opts.elevatorAssetId,
    entry_type: "fee",
    amount: remaining,
    currency: "TRY",
    label: `Revizyon bakiyesi — ${opts.unitCode} (${ticketLabel} bilet)`,
    notes: `${marker}\nKontrol sonrası otomatik kayıt (kalan tutar, peşinat düşülmüş).`,
    occurred_on: opts.occurredOn,
    payment_status: "unpaid",
  });

  if (!result.ok) {
    return { created: false };
  }
  return { created: true, financeEntryId: result.id };
}
