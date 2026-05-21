"use server";

import { requireTenantId } from "@/lib/auth/require-tenant";
import { enqueueSmsOutbox } from "@/lib/data/sms-outbox";

/** Kiracı bağlamında kuyruğa SMS ekler; gönderim cron ile Netgsm üzerinden yapılır. */
export async function enqueueTenantSmsAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const phone = String(formData.get("phone") ?? "");
  const body = String(formData.get("body") ?? "");
  const maxRaw = formData.get("max_attempts");
  const parsed =
    maxRaw != null && String(maxRaw).trim() !== "" ? Number.parseInt(String(maxRaw), 10) : NaN;
  const maxAttempts = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  const r = await enqueueSmsOutbox({
    tenantId,
    phone,
    body,
    ...(maxAttempts != null ? { maxAttempts } : {}),
  });
  if (!r.ok) return r;
  if (!("id" in r)) {
    return { ok: false, error: "Bu gönderim zaten kuyrukta" };
  }
  return { ok: true, id: r.id };
}
