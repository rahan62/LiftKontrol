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
 * Son kontrol sonrası tek bir asansör kapsamlı borç/satır oluşturur (idempotent).
 * Anlaşılan teklif tutarı (`total_fee_try`) üzerinden, bu revizyona daha önce işlenmiş
 * (peşinat + aynı revizyonun otomatik kapanış) satırları düştükten sonraki **kalan** tutar yazılır.
 * Kalan 0 TRY olsa bile (veya anlaşılan tutar 0 olsa bile) kayıt eklenir; bekleyen tahsilat için 0 ise `paid`.
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

  const agreedTry = Number.isFinite(opts.totalFeeTry) && opts.totalFeeTry >= 0 ? opts.totalFeeTry : 0;

  const already = await sumRevisionLinkedFinanceAmount(tenantId, opts.revisionId, opts.elevatorAssetId);
  const remainingTry = Math.max(0, agreedTry - already);
  const amountPosted = Number(remainingTry.toFixed(2));

  const ticketLabel = TICKET_TR[opts.finalTicket];
  const agreedFmt = agreedTry.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let label = `Revizyon bakiyesi — ${opts.unitCode} (${ticketLabel} bilet)`;
  if (amountPosted <= 0 && agreedTry > 0) {
    label = `Revizyon tamamı — ${opts.unitCode} (${ticketLabel} bilet) · kalan 0 TRY`;
  }
  if (amountPosted <= 0 && agreedTry <= 0) {
    label = `Revizyon tamamı — ${opts.unitCode} (${ticketLabel} bilet) · 0 TRY`;
  }

  const result = await insertFinanceEntry(tenantId, {
    site_id: null,
    elevator_asset_id: opts.elevatorAssetId,
    entry_type: "fee",
    amount: amountPosted,
    currency: "TRY",
    label,
    notes: `${marker}\nAnlaşılan revizyon tutarı: ${agreedFmt} TRY. Kontrol tamamı; cariye yazılan kalan tutar ${amountPosted.toFixed(2)} TRY (otomatik).`,
    occurred_on: opts.occurredOn,
    payment_status: amountPosted > 0 ? "unpaid" : "paid",
  });

  if (!result.ok) {
    return { created: false };
  }
  return { created: true, financeEntryId: result.id };
}
