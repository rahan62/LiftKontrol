"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { getPool } from "@/lib/db/pool";
import { writeStoredBlob } from "@/lib/storage/blob-store";

export async function createContractAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const counterparty_name = String(formData.get("counterparty_name") ?? "").trim();
  const start_at = String(formData.get("start_at") ?? "").trim();
  const end_at = String(formData.get("end_at") ?? "").trim();
  const transfer = String(formData.get("maintenance_transfer_basis") ?? "").trim();
  const maintenance_transfer_basis =
    transfer === "direct_after_prior_expiry" || transfer === "after_annual_en8120" ? transfer : null;
  const file = formData.get("file");

  if (!customer_id || !title || !start_at) {
    redirect("/app/contracts/new");
  }

  let storedPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    storedPath = await writeStoredBlob({
      tenantId,
      category: "contracts",
      originalFilename: file.name || `${randomUUID()}.bin`,
      bytes: buf,
    });
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO contracts (
       tenant_id, customer_id, contract_type, status, title, start_at, end_at, counterparty_name, stored_file_path,
       maintenance_transfer_basis
     ) VALUES ($1, $2, 'maintenance', 'active', $3, $4::date, $5::date, $6, $7, $8)`,
    [
      tenantId,
      customer_id,
      title,
      start_at,
      end_at || null,
      counterparty_name || null,
      storedPath,
      maintenance_transfer_basis,
    ],
  );

  revalidatePath("/app/contracts");
  redirect("/app/contracts");
}
