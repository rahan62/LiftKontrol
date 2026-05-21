import { enqueueSmsOutbox } from "@/lib/data/sms-outbox";
import { getPool } from "@/lib/db/pool";
import { normalizeTrGsmForNetgsm } from "@/lib/sms/phone-tr";
import { smsMonthlyCariEnqueueEnabled } from "@/lib/sms/sms-feature-flags";

const BODY_MAX = 480;

/** Kuyruk anahtarı için YYYY-MM (UTC). */
export function cariSmsBucketYm(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function truncateForSms(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatMoneyTr(amount: number, currency: string): string {
  const cur = currency?.trim() || "TRY";
  const n = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${n} ${cur}`;
}

type CariRow = {
  tenant_id: string;
  tenant_name: string;
  customer_id: string;
  legal_name: string;
  phone_raw: string;
  outstanding: string;
  currency: string;
};

/**
 * Her kiracı için aktif müşterilere (birincil iletişim telefonu) güncel net cari bakiyesini SMS olarak kuyruklar.
 * Ay başına müşteri başına bir kez (`dedupe_key` ile).
 */
export async function enqueueMonthlyCariSmsForAllTenants(bucketYm?: string): Promise<{
  tenants: number;
  customersWithPhone: number;
  enqueued: number;
  skippedDuplicate: number;
  skippedBadPhone: number;
}> {
  if (!smsMonthlyCariEnqueueEnabled()) {
    return { tenants: 0, customersWithPhone: 0, enqueued: 0, skippedDuplicate: 0, skippedBadPhone: 0 };
  }
  const ym = bucketYm?.trim() || cariSmsBucketYm();
  const pool = getPool();

  const { rows: tenants } = await pool.query<{ id: string; name: string }>(
    `SELECT id::text, name FROM tenants ORDER BY name ASC`,
  );

  let customersWithPhone = 0;
  let enqueued = 0;
  let skippedDuplicate = 0;
  let skippedBadPhone = 0;

  for (const t of tenants) {
    const { rows } = await pool.query<CariRow>(
      `SELECT $1::text AS tenant_id,
              $2::text AS tenant_name,
              c.id::text AS customer_id,
              c.legal_name,
              cc.phone AS phone_raw,
              COALESCE(rx.outstanding, 0)::text AS outstanding,
              COALESCE(rx.currency, 'TRY') AS currency
       FROM customers c
       INNER JOIN LATERAL (
         SELECT phone FROM customer_contacts
         WHERE tenant_id = $1::uuid AND customer_id = c.id
           AND phone IS NOT NULL AND trim(phone) <> ''
         ORDER BY is_primary DESC, updated_at DESC
         LIMIT 1
       ) cc ON true
       LEFT JOIN LATERAL (
         SELECT
           COALESCE(SUM(
             CASE
               WHEN fe.entry_type = 'credit_note' THEN -(ABS(fe.amount::numeric))
               ELSE ABS(fe.amount::numeric)
             END
           ), 0)::numeric AS outstanding,
           MAX(fe.currency) AS currency
         FROM finance_entries fe
         WHERE fe.tenant_id = $1::uuid
           AND fe.customer_id = c.id
           AND fe.payment_status = 'unpaid'
           AND fe.entry_type IN ('invoice', 'fee', 'credit_note')
       ) rx ON true
       WHERE c.tenant_id = $1::uuid AND c.status = 'active'`,
      [t.id, t.name],
    );

    for (const row of rows) {
      customersWithPhone++;
      const phone = normalizeTrGsmForNetgsm(row.phone_raw);
      if (!phone) {
        skippedBadPhone++;
        continue;
      }
      const amt = Number(row.outstanding);
      const safeAmt = Number.isFinite(amt) ? amt : 0;
      const amtStr = formatMoneyTr(safeAmt, row.currency);
      const line = `Sayın ${row.legal_name}, güncel net cari bakiyeniz ${amtStr}.`;
      const body = truncateForSms(`${row.tenant_name}: ${line}`, BODY_MAX);
      const dedupeKey = `cari:${row.tenant_id}:${row.customer_id}:${ym}`;
      const r = await enqueueSmsOutbox({
        tenantId: row.tenant_id,
        phone,
        body,
        dedupeKey,
      });
      if (r.ok && "skipped" in r && r.skipped) skippedDuplicate++;
      else if (r.ok) enqueued++;
    }
  }

  return {
    tenants: tenants.length,
    customersWithPhone,
    enqueued,
    skippedDuplicate,
    skippedBadPhone,
  };
}
