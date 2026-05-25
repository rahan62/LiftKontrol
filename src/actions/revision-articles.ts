"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { getPool } from "@/lib/db/pool";

function parseTier(formData: FormData): string {
  const tierRaw = String(formData.get("ticket_tier") ?? "green").trim();
  return tierRaw === "blue" || tierRaw === "yellow" || tierRaw === "red" || tierRaw === "green"
    ? tierRaw
    : "green";
}

function parseCost(formData: FormData): number | null {
  const default_cost = String(formData.get("default_cost_try") ?? "").trim();
  if (default_cost === "") return null;
  const n = Number.parseFloat(default_cost);
  return Number.isFinite(n) ? n : null;
}

function isPgUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

export async function createRevisionArticleAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const article_code = String(formData.get("article_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const default_cost_try = parseCost(formData);
  const ticket_tier = parseTier(formData);

  if (!article_code || !title) {
    return { ok: false, error: "Madde kodu ve başlık zorunludur." };
  }
  if (default_cost_try !== null && default_cost_try < 0) {
    return { ok: false, error: "Maliyet negatif olamaz." };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM revision_articles WHERE tenant_id = $1`,
    [tenantId],
  );
  const sort_order = rows[0]?.n ? Number.parseInt(rows[0].n, 10) : 1;

  try {
    await pool.query(
      `INSERT INTO revision_articles (tenant_id, sort_order, article_code, title, description, default_cost_try, ticket_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, sort_order, article_code, title, description, default_cost_try, ticket_tier],
    );
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      return { ok: false, error: "Bu madde kodu zaten kayıtlı." };
    }
    return { ok: false, error: "Madde kaydedilemedi." };
  }
  revalidatePath("/app/revision-articles");
  return { ok: true };
}

export async function updateRevisionArticleAction(
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const article_code = String(formData.get("article_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const default_cost_try = parseCost(formData);
  const ticket_tier = parseTier(formData);

  if (!article_code || !title) {
    return { ok: false, error: "Madde kodu ve başlık zorunludur." };
  }
  if (default_cost_try !== null && default_cost_try < 0) {
    return { ok: false, error: "Maliyet negatif olamaz." };
  }

  const pool = getPool();
  try {
    const r = await pool.query(
      `UPDATE revision_articles
       SET article_code = $1,
           title = $2,
           description = $3,
           default_cost_try = $4,
           ticket_tier = $5
       WHERE tenant_id = $6 AND id = $7::uuid`,
      [article_code, title, description, default_cost_try, ticket_tier, tenantId, id],
    );
    if (r.rowCount === 0) {
      return { ok: false, error: "Madde bulunamadı veya erişim yok." };
    }
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      return { ok: false, error: "Bu madde kodu zaten başka bir kayıtta kullanılıyor." };
    }
    return { ok: false, error: "Madde güncellenemedi." };
  }

  revalidatePath("/app/revision-articles");
  revalidatePath("/app/periodic-controls");
  return { ok: true };
}
