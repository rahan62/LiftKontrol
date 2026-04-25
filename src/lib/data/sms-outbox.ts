import { getPool } from "@/lib/db/pool";
import { getNetgsmEnv } from "@/lib/sms/netgsm-env";
import { normalizeTrGsmForNetgsm } from "@/lib/sms/phone-tr";
import { sendNetgsmSms } from "@/lib/sms/netgsm-send";

export type SmsOutboxRow = {
  id: string;
  tenant_id: string | null;
  phone: string;
  body: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  provider_job_id: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_STALE_MIN = 15;
const DEFAULT_MAX_PER_RUN = 100;

function staleMinutes(): number {
  const n = Number.parseInt(process.env.SMS_OUTBOX_STALE_MINUTES ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STALE_MIN;
}

/** Kuyruğa ekle (sunucu tarafı; tenant opsiyonel). */
export async function enqueueSmsOutbox(input: {
  tenantId: string | null;
  phone: string;
  body: string;
  maxAttempts?: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const normalized = normalizeTrGsmForNetgsm(input.phone);
  if (!normalized) {
    return { ok: false, error: "Geçersiz GSM (10 hane, 5 ile başlamalı)" };
  }
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Mesaj boş olamaz" };
  }
  const maxAttempts =
    input.maxAttempts != null && input.maxAttempts > 0 ? Math.min(input.maxAttempts, 20) : 5;

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `insert into public.sms_outbox (tenant_id, phone, body, max_attempts)
     values ($1::uuid, $2, $3, $4)
     returning id::text`,
    [input.tenantId, normalized, body, maxAttempts],
  );
  const id = rows[0]?.id;
  if (!id) return { ok: false, error: "Kayıt oluşturulamadı" };
  return { ok: true, id };
}

/** `sending` uzun süredir güncellenmediyse yeniden pending yap (cron çökmesi). */
export async function requeueStaleSmsOutbox(): Promise<number> {
  const pool = getPool();
  const min = staleMinutes();
  const { rowCount } = await pool.query(
    `update public.sms_outbox
     set status = 'pending',
         last_error = coalesce(nullif(trim(coalesce(last_error, '')), '') || E'\n', '') ||
           ('Gönderim zaman aşımı (' || $1::text || ' dk); yeniden kuyruğa alındı.')
     where status = 'sending'
       and updated_at < now() - ($1::integer * interval '1 minute')`,
    [min],
  );
  return rowCount ?? 0;
}

/** Bir sonraki pending satırı kilitle ve `sending` yap. */
export async function claimNextSmsOutbox(): Promise<SmsOutboxRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<SmsOutboxRow>(
    `with next_item as (
       select id
       from public.sms_outbox
       where status = 'pending'
       order by created_at asc
       for update skip locked
       limit 1
     )
     update public.sms_outbox o
     set status = 'sending',
         attempts = o.attempts + 1,
         updated_at = now()
     from next_item
     where o.id = next_item.id
     returning o.id::text,
       o.tenant_id::text,
       o.phone,
       o.body,
       o.status,
       o.attempts,
       o.max_attempts,
       o.last_error,
       o.provider_job_id,
       o.created_at::text,
       o.updated_at::text`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...r,
    tenant_id: r.tenant_id || null,
  };
}

async function markSmsSent(id: string, jobid?: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update public.sms_outbox
     set status = 'sent', provider_job_id = $2, last_error = null, updated_at = now()
     where id = $1::uuid`,
    [id, jobid ?? null],
  );
}

async function markSmsRetryOrFail(id: string, attempts: number, maxAttempts: number, err: string): Promise<void> {
  const pool = getPool();
  if (attempts >= maxAttempts) {
    await pool.query(
      `update public.sms_outbox
       set status = 'failed', last_error = $2, updated_at = now()
       where id = $1::uuid`,
      [id, err.slice(0, 2000)],
    );
    return;
  }
  await pool.query(
    `update public.sms_outbox
     set status = 'pending', last_error = $2, updated_at = now()
     where id = $1::uuid`,
    [id, err.slice(0, 2000)],
  );
}

export type ProcessSmsOutboxResult = {
  staleRequeued: number;
  processed: number;
  sent: number;
  retriedOrFailed: number;
  skippedNoConfig: boolean;
};

/**
 * Netgsm yapılandırılmışsa kuyruktaki kayıtları tek tek gönderir (sıra: created_at).
 */
export async function processSmsOutboxQueue(): Promise<ProcessSmsOutboxResult> {
  const result: ProcessSmsOutboxResult = {
    staleRequeued: 0,
    processed: 0,
    sent: 0,
    retriedOrFailed: 0,
    skippedNoConfig: false,
  };

  if (!getNetgsmEnv()) {
    result.skippedNoConfig = true;
    return result;
  }

  result.staleRequeued = await requeueStaleSmsOutbox();

  const maxRun =
    Number.parseInt(process.env.SMS_OUTBOX_MAX_PER_CRON ?? "", 10) > 0
      ? Math.min(Number.parseInt(process.env.SMS_OUTBOX_MAX_PER_CRON ?? "", 10), 500)
      : DEFAULT_MAX_PER_RUN;

  for (let i = 0; i < maxRun; i++) {
    const row = await claimNextSmsOutbox();
    if (!row) break;
    result.processed++;
    const send = await sendNetgsmSms(row.phone, row.body);
    if (send.ok) {
      await markSmsSent(row.id, send.jobid);
      result.sent++;
    } else {
      await markSmsRetryOrFail(row.id, row.attempts, row.max_attempts, `${send.code}: ${send.description}`);
      result.retriedOrFailed++;
    }
  }

  return result;
}
