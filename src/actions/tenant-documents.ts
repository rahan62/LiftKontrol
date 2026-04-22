"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { assertSiteBelongsToCustomer } from "@/lib/data/projects-data";
import { getPool } from "@/lib/db/pool";
import { guessContentType, writeStoredBlob } from "@/lib/storage/blob-store";

export async function createTenantDocumentAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const customer_id = String(formData.get("customer_id") ?? "").trim() || null;
  const site_id = String(formData.get("site_id") ?? "").trim() || null;
  const project_id = String(formData.get("project_id") ?? "").trim() || null;
  const file = formData.get("file");

  if (!title || !(file instanceof File) || file.size === 0) {
    redirect("/app/documents/new");
  }

  if (site_id && customer_id) {
    const ok = await assertSiteBelongsToCustomer(tenantId, site_id, customer_id);
    if (!ok) redirect("/app/documents/new");
  } else if (site_id && !customer_id) {
    redirect("/app/documents/new");
  }

  const pool = getPool();
  if (project_id) {
    const { rows } = await pool.query<{ ok: boolean }>(
      `SELECT true AS ok FROM projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, project_id],
    );
    if (!rows[0]?.ok) redirect("/app/documents/new");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await writeStoredBlob({
    tenantId,
    category: "documents",
    originalFilename: file.name || "document",
    bytes: buf,
    contentType: guessContentType(file.name || ""),
  });

  await pool.query(
    `INSERT INTO tenant_documents (
       tenant_id, title, description, stored_path, original_filename, mime_type,
       customer_id, site_id, project_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tenantId,
      title,
      description,
      stored,
      file.name || null,
      guessContentType(file.name || ""),
      customer_id,
      site_id,
      project_id,
    ],
  );

  revalidatePath("/app/documents");
  redirect("/app/documents");
}
