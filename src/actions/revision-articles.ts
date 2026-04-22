"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { getPool } from "@/lib/db/pool";

export async function createRevisionArticleAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const article_code = String(formData.get("article_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const default_cost = String(formData.get("default_cost_try") ?? "").trim();
  const default_cost_try = default_cost === "" ? null : Number.parseFloat(default_cost);
  const tierRaw = String(formData.get("ticket_tier") ?? "green").trim();
  const ticket_tier =
    tierRaw === "blue" || tierRaw === "yellow" || tierRaw === "red" || tierRaw === "green" ? tierRaw : "green";
  if (!article_code || !title) {
    redirect("/app/revision-articles");
  }
  if (default_cost_try !== null && !Number.isFinite(default_cost_try)) {
    redirect("/app/revision-articles");
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
  } catch {
    redirect("/app/revision-articles");
  }
  revalidatePath("/app/revision-articles");
  redirect("/app/revision-articles");
}
