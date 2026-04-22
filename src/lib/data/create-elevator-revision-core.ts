import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { buildRevisionOfferPdf } from "@/lib/pdf/revision-offer-pdf";
import { getTenantBranding } from "@/lib/data/tenant-branding";
import { deleteStoredBlob, readStoredBlob, writeStoredBlob } from "@/lib/storage/blob-store";

export type CreateElevatorRevisionInput = {
  periodicControlId: string;
  revisionArticleIds: string[];
};

/**
 * Shared by server action and mobile API: PDF teklif + DB kayıt + deadline (kontrol + 60 gün).
 */
export async function createElevatorRevisionForTenant(
  tenantId: string,
  input: CreateElevatorRevisionInput,
): Promise<{ ok: true; revisionId: string } | { ok: false; error: string }> {
  const { periodicControlId, revisionArticleIds } = input;
  if (!periodicControlId || !revisionArticleIds?.length) {
    return { ok: false, error: "Kontrol ve en az bir madde seçin." };
  }

  const pool = getPool();
  const { rows: pcRows } = await pool.query<{ elevator_asset_id: string }>(
    `SELECT elevator_asset_id FROM periodic_controls WHERE tenant_id = $1 AND id = $2`,
    [tenantId, periodicControlId],
  );
  const elevatorId = pcRows[0]?.elevator_asset_id;
  if (!elevatorId) {
    return { ok: false, error: "Periyodik kontrol bulunamadı." };
  }

  const { rows: artRows } = await pool.query<{
    id: string;
    article_code: string;
    title: string;
    default_cost_try: string | null;
  }>(
    `SELECT id, article_code, title, default_cost_try::text AS default_cost_try
     FROM revision_articles
     WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [tenantId, revisionArticleIds],
  );
  if (artRows.length !== revisionArticleIds.length) {
    return { ok: false, error: "Bazı maddeler geçersiz veya eksik." };
  }

  const priceMap = new Map(
    artRows.map((a) => {
      const p = a.default_cost_try != null ? Number.parseFloat(a.default_cost_try) : 0;
      return [a.id, Number.isFinite(p) ? p : 0];
    }),
  );

  let total = 0;
  for (const id of revisionArticleIds) {
    total += priceMap.get(id) ?? 0;
  }

  const revisionId = randomUUID();
  const branding = await getTenantBranding(tenantId);

  let logoBytes: Uint8Array | null = null;
  if (branding?.logo_path) {
    try {
      const buf = await readStoredBlob(branding.logo_path);
      logoBytes = new Uint8Array(buf);
    } catch {
      logoBytes = null;
    }
  }

  const { rows: meta } = await pool.query<{
    unit_code: string;
    site_name: string | null;
    customer_name: string | null;
  }>(
    `SELECT ea.unit_code, s.name AS site_name, c.legal_name AS customer_name
     FROM elevator_assets ea
     LEFT JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1 AND ea.id = $2`,
    [tenantId, elevatorId],
  );
  const m = meta[0];

  const lines = revisionArticleIds.map((id) => {
    const a = artRows.find((x) => x.id === id)!;
    return {
      article_code: a.article_code,
      title: a.title,
      unit_price_try: priceMap.get(id) ?? 0,
    };
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildRevisionOfferPdf({
      companyName: branding?.name ?? "Şirket",
      logoAbsolutePath: null,
      logoBytes,
      unitCode: m?.unit_code ?? "—",
      siteName: m?.site_name ?? null,
      customerName: m?.customer_name ?? null,
      lines,
      totalTry: total,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PDF oluşturulamadı" };
  }

  let offerStored: string;
  try {
    offerStored = await writeStoredBlob({
      tenantId,
      category: "revisions",
      originalFilename: `${revisionId}.pdf`,
      bytes: Buffer.from(pdfBytes),
      contentType: "application/pdf",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Teklif dosyası yazılamadı" };
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    await db.query(
      `INSERT INTO elevator_revisions (
         id, tenant_id, elevator_asset_id, periodic_control_id, total_fee_try, offer_pdf_path
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6)`,
      [revisionId, tenantId, elevatorId, periodicControlId, total, offerStored],
    );

    let sort = 0;
    for (const aid of revisionArticleIds) {
      const unit = priceMap.get(aid) ?? 0;
      await db.query(
        `INSERT INTO elevator_revision_lines (tenant_id, revision_id, revision_article_id, unit_price_try, sort_order)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)`,
        [tenantId, revisionId, aid, unit, sort++],
      );
    }

    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    await deleteStoredBlob(offerStored);
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt başarısız" };
  } finally {
    db.release();
  }

  await pool.query(
    `UPDATE elevator_revisions er
     SET deadline_at = (pc.control_date + interval '60 days')::date
     FROM periodic_controls pc
     WHERE er.id = $1::uuid AND er.tenant_id = $2::uuid AND er.periodic_control_id = pc.id`,
    [revisionId, tenantId],
  );

  return { ok: true, revisionId };
}

/** Mobil API: teknisyen ve portal kullanıcıları revizyon oluşturamaz (web WorkspaceAccess.admin ile uyumlu). */
export function canCreateElevatorRevisionForRole(systemRole: string): boolean {
  const r = systemRole.trim().toLowerCase();
  return r !== "technician" && r !== "customer_portal_user";
}
