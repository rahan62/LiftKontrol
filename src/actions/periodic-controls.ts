"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { getPool } from "@/lib/db/pool";
import { writeStoredBlob } from "@/lib/storage/blob-store";

export async function createPeriodicControlAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const elevator_asset_id = String(formData.get("elevator_asset_id") ?? "").trim();
  const control_date = String(formData.get("control_date") ?? "").trim();
  const issuer_name = String(formData.get("issuer_name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const file = formData.get("file");

  if (!elevator_asset_id || !control_date) {
    redirect("/app/periodic-controls/new");
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect("/app/periodic-controls/new");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storedPath = await writeStoredBlob({
    tenantId,
    category: "periodic-controls",
    originalFilename: file.name || `${randomUUID()}.pdf`,
    bytes: buf,
    contentType: "application/pdf",
  });

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO periodic_controls (
       tenant_id, elevator_asset_id, control_date, issuer_name, notes, form_file_path
     ) VALUES ($1, $2, $3::date, $4, $5, $6)
     RETURNING id`,
    [tenantId, elevator_asset_id, control_date, issuer_name, notes, storedPath],
  );
  const id = rows[0]?.id;
  revalidatePath("/app/periodic-controls");
  if (id) {
    redirect(`/app/periodic-controls/${id}`);
  }
  redirect("/app/periodic-controls");
}
