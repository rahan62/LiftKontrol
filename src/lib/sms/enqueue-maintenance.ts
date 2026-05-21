import { enqueueSmsOutbox } from "@/lib/data/sms-outbox";
import { getPool } from "@/lib/db/pool";
import { extractTrGsmFromFreeText } from "@/lib/sms/parse-phones";
import { normalizeTrGsmForNetgsm } from "@/lib/sms/phone-tr";
import { smsMaintenanceEnqueueEnabled } from "@/lib/sms/sms-feature-flags";

const BODY_MAX = 480;
const LOOKBACK_DAYS = 21;

type MaintRow = {
  id: string;
  tenant_id: string;
  completed_at: string;
  notes: string | null;
  unit_code: string;
  site_name: string;
  emergency_phones: string | null;
  customer_id: string;
  tenant_name: string;
};

function truncateForSms(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatCompletedAtTr(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

async function loadMaintenanceContext(maintenanceId: string): Promise<MaintRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<MaintRow>(
    `SELECT emm.id::text,
            emm.tenant_id::text,
            emm.completed_at::text,
            emm.notes,
            ea.unit_code,
            s.name AS site_name,
            s.emergency_phones,
            ea.customer_id::text,
            t.name AS tenant_name
     FROM elevator_monthly_maintenance emm
     JOIN elevator_assets ea ON ea.id = emm.elevator_asset_id AND ea.tenant_id = emm.tenant_id
     JOIN sites s ON s.id = ea.site_id AND s.tenant_id = emm.tenant_id
     JOIN tenants t ON t.id = emm.tenant_id
     WHERE emm.id = $1::uuid`,
    [maintenanceId],
  );
  return rows[0] ?? null;
}

async function loadPrimaryCustomerPhones(tenantId: string, customerId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ phone: string }>(
    `SELECT phone FROM customer_contacts
     WHERE tenant_id = $1::uuid AND customer_id = $2::uuid
       AND phone IS NOT NULL AND trim(phone) <> ''
     ORDER BY is_primary DESC, updated_at DESC
     LIMIT 3`,
    [tenantId, customerId],
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const n = normalizeTrGsmForNetgsm(r.phone);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function buildMaintenanceBody(row: MaintRow): string {
  const when = formatCompletedAtTr(row.completed_at);
  const notesPart = row.notes?.trim() ? ` Ek not: ${truncateForSms(row.notes, 120)}` : "";
  const base = `${row.tenant_name}: ${row.unit_code} (${row.site_name}) için aylık bakım ${when} tarihinde tamamlandı.${notesPart}`;
  return truncateForSms(base, BODY_MAX);
}

/** Tek bakım kaydı için kuyruğa SMS ekler (aynı bakım + telefon için tekrarlamaz). */
export async function enqueueMaintenanceSmsForMaintenanceId(maintenanceId: string): Promise<{
  enqueued: number;
  skippedDuplicate: number;
  noRecipients: boolean;
}> {
  if (!smsMaintenanceEnqueueEnabled()) {
    return { enqueued: 0, skippedDuplicate: 0, noRecipients: false };
  }
  const row = await loadMaintenanceContext(maintenanceId);
  if (!row) {
    return { enqueued: 0, skippedDuplicate: 0, noRecipients: true };
  }

  const sitePhones = extractTrGsmFromFreeText(row.emergency_phones);
  const custPhones = await loadPrimaryCustomerPhones(row.tenant_id, row.customer_id);
  const recipients = [...new Set([...sitePhones, ...custPhones])];
  if (recipients.length === 0) {
    return { enqueued: 0, skippedDuplicate: 0, noRecipients: true };
  }

  const body = buildMaintenanceBody(row);
  let enqueued = 0;
  let skippedDuplicate = 0;

  for (const phone of recipients) {
    const dedupeKey = `maint:${maintenanceId}:${phone}`;
    const r = await enqueueSmsOutbox({
      tenantId: row.tenant_id,
      phone,
      body,
      dedupeKey,
    });
    if (r.ok && "skipped" in r && r.skipped) skippedDuplicate++;
    else if (r.ok) enqueued++;
  }

  return { enqueued, skippedDuplicate, noRecipients: false };
}

/** Son N gündeki bakım kayıtlarını tarar (iOS dahil tüm istemciler). */
export async function scanRecentMaintenanceForSmsEnqueue(): Promise<{
  maintenanceRows: number;
  enqueued: number;
  skippedDuplicate: number;
  noRecipients: number;
  errors: number;
}> {
  if (!smsMaintenanceEnqueueEnabled()) {
    return { maintenanceRows: 0, enqueued: 0, skippedDuplicate: 0, noRecipients: 0, errors: 0 };
  }
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT emm.id::text
     FROM elevator_monthly_maintenance emm
     WHERE emm.completed_at >= now() - ($1::integer * interval '1 day')
     ORDER BY emm.completed_at ASC`,
    [LOOKBACK_DAYS],
  );

  let enqueued = 0;
  let skippedDuplicate = 0;
  let noRecipients = 0;
  let errors = 0;

  for (const r of rows) {
    try {
      const res = await enqueueMaintenanceSmsForMaintenanceId(r.id);
      enqueued += res.enqueued;
      skippedDuplicate += res.skippedDuplicate;
      if (res.noRecipients) noRecipients++;
    } catch {
      errors++;
    }
  }

  return {
    maintenanceRows: rows.length,
    enqueued,
    skippedDuplicate,
    noRecipients,
    errors,
  };
}
