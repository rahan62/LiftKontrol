"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { assertSiteBelongsToCustomer } from "@/lib/data/projects-data";
import { getPool } from "@/lib/db/pool";
import { writeStoredBlob } from "@/lib/storage/blob-store";

export async function createProjectAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "").trim();
  const site_id = String(formData.get("site_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const project_type = String(formData.get("project_type") ?? "").trim() || "assembly";
  const status = String(formData.get("status") ?? "").trim() || "planning";
  const planned_start = String(formData.get("planned_start") ?? "").trim() || null;
  const planned_end = String(formData.get("planned_end") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const file = formData.get("spec");

  if (!customer_id || !site_id || !name) {
    redirect("/app/projects/new");
  }

  const okSite = await assertSiteBelongsToCustomer(tenantId, site_id, customer_id);
  if (!okSite) {
    redirect("/app/projects/new");
  }

  let specPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    specPath = await writeStoredBlob({
      tenantId,
      category: "project-specs",
      originalFilename: file.name || "spec.pdf",
      bytes: buf,
    });
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO projects (
       tenant_id, customer_id, site_id, name, project_type, status,
       planned_start, planned_end, notes, spec_file_path
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10)`,
    [
      tenantId,
      customer_id,
      site_id,
      name,
      project_type,
      status,
      planned_start,
      planned_end,
      notes,
      specPath,
    ],
  );

  revalidatePath("/app/projects");
  redirect("/app/projects");
}
