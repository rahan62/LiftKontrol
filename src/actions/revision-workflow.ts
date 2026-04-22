"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { computeFinalTicket, type TicketTier, isFinalTicketWorseThanAgreed } from "@/lib/domain/en8120-tickets";
import { getPool } from "@/lib/db/pool";
import { maybeCreateRevisionCompletionFinance } from "@/lib/data/revision-completion-finance";
import { revisionDownPaymentMarker } from "@/lib/data/revision-finance-helpers";
import { insertFinanceEntry } from "@/lib/data/writes";
import { guessContentType, writeStoredBlob } from "@/lib/storage/blob-store";

const TICKETS = new Set(["green", "blue", "yellow", "red"]);

export async function approveRevisionAction(
  revisionId: string,
  approved: boolean,
  agreedTargetTicket: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const pool = getPool();

  if (approved) {
    const t = (agreedTargetTicket ?? "").trim().toLowerCase();
    if (!TICKETS.has(t)) {
      return { ok: false, error: "Sözleşmede hedef etiket (yeşil / mavi / sarı / kırmızı) seçin." };
    }
  }

  const status = approved ? "approved" : "rejected";
  const agreed = approved ? agreedTargetTicket!.trim().toLowerCase() : null;

  const r = await pool.query(
    `UPDATE elevator_revisions
     SET approval_status = $3,
         approved_at = CASE WHEN $3 = 'approved' THEN now() ELSE NULL END,
         agreed_target_ticket = CASE WHEN $3 = 'approved' THEN $4::text ELSE NULL END,
         contract_signed_at = CASE WHEN $3 = 'approved' THEN now() ELSE NULL END,
         needs_rework = false
     WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, revisionId, status, agreed],
  );
  if (r.rowCount === 0) return { ok: false, error: "Bulunamadı" };
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function recordRevisionDownPaymentAction(
  revisionId: string,
  amountRaw: string,
  occurredOn: string,
): Promise<{ ok: true; financeEntryId?: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const amount = Number.parseFloat(amountRaw.replace(",", ".").trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Geçerli tutar girin" };
  }
  const on = occurredOn.trim().slice(0, 10);
  if (!on) return { ok: false, error: "Tarih gerekli" };

  const pool = getPool();
  const { rows } = await pool.query<{ elevator_asset_id: string; unit_code: string }>(
    `SELECT ea.id::text AS elevator_asset_id, ea.unit_code
     FROM elevator_revisions er
     INNER JOIN elevator_assets ea ON ea.id = er.elevator_asset_id AND ea.tenant_id = er.tenant_id
     WHERE er.tenant_id = $1::uuid AND er.id = $2::uuid AND er.approval_status = 'approved'`,
    [tenantId, revisionId],
  );
  const meta = rows[0];
  if (!meta) return { ok: false, error: "Önce teklif onaylanmalı" };

  const marker = revisionDownPaymentMarker(revisionId);
  const res = await insertFinanceEntry(tenantId, {
    site_id: null,
    elevator_asset_id: meta.elevator_asset_id,
    entry_type: "fee",
    amount,
    currency: "TRY",
    label: `Revizyon peşinatı — ${meta.unit_code}`,
    notes: `${marker}\nRevizyon sözleşmesi peşinatı.`,
    occurred_on: on,
    payment_status: "unpaid",
  });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/app/finances");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true, financeEntryId: res.id };
}

export async function markRevisionPurchasingDoneAction(
  revisionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const pool = getPool();
  const r = await pool.query(
    `UPDATE elevator_revisions
     SET purchasing_completed_at = now()
     WHERE tenant_id = $1::uuid AND id = $2::uuid
       AND approval_status = 'approved'
       AND purchasing_completed_at IS NULL`,
    [tenantId, revisionId],
  );
  if (r.rowCount === 0) return { ok: false, error: "Önce onay gerekli veya zaten işaretlendi" };
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function markRevisionWorkStartedAction(
  revisionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const pool = getPool();
  const r = await pool.query(
    `UPDATE elevator_revisions
     SET work_started_at = now()
     WHERE tenant_id = $1::uuid AND id = $2::uuid
       AND approval_status = 'approved'
       AND purchasing_completed_at IS NOT NULL
       AND work_started_at IS NULL`,
    [tenantId, revisionId],
  );
  if (r.rowCount === 0) {
    return { ok: false, error: "Önce satın alma aşamasını tamamlayın" };
  }
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function scheduleRevisionWorkAction(
  revisionId: string,
  scheduledDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  if (!scheduledDate?.trim()) return { ok: false, error: "Tarih gerekli" };
  const pool = getPool();
  const r = await pool.query(
    `UPDATE elevator_revisions
     SET scheduled_work_at = $3::date
     WHERE tenant_id = $1::uuid AND id = $2::uuid
       AND approval_status = 'approved'
       AND work_started_at IS NOT NULL`,
    [tenantId, revisionId, scheduledDate.trim().slice(0, 10)],
  );
  if (r.rowCount === 0) {
    return { ok: false, error: "Önce «İşe başladı» aşamasını tamamlayın; ardından plan tarihi kaydedilir." };
  }
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function markRevisionWorkCompleteAction(
  revisionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const pool = getPool();
  const r = await pool.query(
    `UPDATE elevator_revisions
     SET work_completed_at = now()
     WHERE tenant_id = $1::uuid AND id = $2::uuid
       AND approval_status = 'approved'
       AND work_started_at IS NOT NULL
       AND scheduled_work_at IS NOT NULL`,
    [tenantId, revisionId],
  );
  if (r.rowCount === 0) {
    return { ok: false, error: "Önce sahada işe başlama ve plan tarihi girin" };
  }
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function uploadRevisionSecondReportAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const tenantId = await requireTenantId();
  const revisionId = String(formData.get("revision_id") ?? "").trim();
  const file = formData.get("file");
  if (!revisionId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Dosya ve revizyon gerekli" };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ ok: boolean }>(
    `SELECT true AS ok FROM elevator_revisions
     WHERE tenant_id = $1::uuid AND id = $2::uuid AND work_completed_at IS NOT NULL`,
    [tenantId, revisionId],
  );
  if (!rows[0]?.ok) return { ok: false, error: "Önce sahada iş tamamlanmalı" };

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await writeStoredBlob({
    tenantId,
    category: "revision-second-control",
    originalFilename: file.name || `${randomUUID()}.pdf`,
    bytes: buf,
    contentType: guessContentType(file.name || ".pdf"),
  });

  const u = await pool.query(
    `UPDATE elevator_revisions
     SET second_control_report_path = $3
     WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, revisionId, stored],
  );
  if (u.rowCount === 0) return { ok: false, error: "Güncellenemedi" };
  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true };
}

export async function submitFinalInspectionAction(
  revisionId: string,
  fulfilledArticleIds: string[],
): Promise<
  { ok: true; ticket: string | null; financeEntryId?: string } | { ok: false; error: string }
> {
  const tenantId = await requireTenantId();
  const pool = getPool();

  const { rows: headRows } = await pool.query<{
    second_control_report_path: string | null;
    agreed_target_ticket: string | null;
  }>(
    `SELECT second_control_report_path, agreed_target_ticket
     FROM elevator_revisions
     WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, revisionId],
  );
  const head = headRows[0];
  if (!head?.second_control_report_path) {
    return { ok: false, error: "Önce 2. kontrol (takip) raporu PDF yükleyin." };
  }

  const { rows: lines } = await pool.query<{ revision_article_id: string; ticket_tier: string }>(
    `SELECT erl.revision_article_id::text AS revision_article_id, ra.ticket_tier
     FROM elevator_revision_lines erl
     INNER JOIN revision_articles ra ON ra.id = erl.revision_article_id AND ra.tenant_id = erl.tenant_id
     WHERE erl.tenant_id = $1::uuid AND erl.revision_id = $2::uuid`,
    [tenantId, revisionId],
  );
  if (!lines.length) return { ok: false, error: "Madde yok" };

  const { rows: metaRows } = await pool.query<{
    elevator_asset_id: string;
    total_fee_try: string;
    unit_code: string;
  }>(
    `SELECT er.elevator_asset_id::text AS elevator_asset_id,
            er.total_fee_try::text AS total_fee_try,
            ea.unit_code
     FROM elevator_revisions er
     INNER JOIN elevator_assets ea ON ea.id = er.elevator_asset_id AND ea.tenant_id = er.tenant_id
     WHERE er.tenant_id = $1::uuid AND er.id = $2::uuid AND er.work_completed_at IS NOT NULL`,
    [tenantId, revisionId],
  );
  const meta = metaRows[0];
  if (!meta) return { ok: false, error: "Önce sahada işi tamamlayın" };

  const byTier: Record<TicketTier, string[]> = { green: [], blue: [], yellow: [], red: [] };
  for (const l of lines) {
    const t = (["green", "blue", "yellow", "red"].includes(l.ticket_tier) ? l.ticket_tier : "green") as TicketTier;
    byTier[t].push(l.revision_article_id);
  }

  const fulfilled = new Set(fulfilledArticleIds);
  const ticket = computeFinalTicket(fulfilled, byTier);

  if (ticket && head.agreed_target_ticket) {
    const agreed = head.agreed_target_ticket as TicketTier;
    if (TICKETS.has(agreed) && isFinalTicketWorseThanAgreed(ticket, agreed)) {
      return {
        ok: false,
        error: `Sonuç bileti (${ticket}) sözleşmede anlaşılan hedefin (${agreed}) altında. Eksik maddeleri tamamlayın veya süreci güncelleyin.`,
      };
    }
  }

  const upd = await pool.query(
    `UPDATE elevator_revisions
     SET final_fulfilled_article_ids = $3::uuid[],
         final_ticket = $4,
         final_inspection_at = now(),
         needs_rework = false
     WHERE tenant_id = $1::uuid AND id = $2::uuid
       AND work_completed_at IS NOT NULL`,
    [tenantId, revisionId, fulfilledArticleIds, ticket],
  );
  if (upd.rowCount === 0) return { ok: false, error: "Önce sahada işi tamamlayın" };

  let financeEntryId: string | undefined;
  if (ticket && (ticket === "green" || ticket === "blue" || ticket === "yellow" || ticket === "red")) {
    const totalFeeTry = Number.parseFloat(meta.total_fee_try);
    const occurredOn = new Date().toISOString().slice(0, 10);
    const fee = await maybeCreateRevisionCompletionFinance(tenantId, {
      revisionId,
      elevatorAssetId: meta.elevator_asset_id,
      totalFeeTry,
      unitCode: meta.unit_code,
      finalTicket: ticket,
      occurredOn,
    });
    if (fee.created && fee.financeEntryId) {
      financeEntryId = fee.financeEntryId;
      revalidatePath("/app/finances");
      revalidatePath(`/app/assets/${meta.elevator_asset_id}`);
    }
  }

  revalidatePath("/app/revisions");
  revalidatePath(`/app/revisions/${revisionId}`);
  return { ok: true, ticket, financeEntryId };
}
