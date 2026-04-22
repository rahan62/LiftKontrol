"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { setTenantLogoPath } from "@/lib/data/tenant-branding";
import { getPool } from "@/lib/db/pool";
import { deleteStoredBlob, writeStoredBlob } from "@/lib/storage/blob-store";

export async function uploadTenantLogoAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Dosya seçin." };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { ok: false, error: "En fazla 3 MB." };
  }

  const ext = (() => {
    const n = file.name.toLowerCase();
    if (n.endsWith(".png")) return "png";
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
    return "png";
  })();

  const buf = Buffer.from(await file.arrayBuffer());
  const relative = await writeStoredBlob({
    tenantId,
    category: "logos",
    originalFilename: `logo-${randomUUID()}.${ext}`,
    bytes: buf,
    contentType: ext === "png" ? "image/png" : "image/jpeg",
  });

  const pool = getPool();
  const { rows } = await pool.query<{ logo_path: string | null }>(`SELECT logo_path FROM tenants WHERE id = $1`, [
    tenantId,
  ]);
  const old = rows[0]?.logo_path;
  if (old) {
    await deleteStoredBlob(old);
  }

  await setTenantLogoPath(tenantId, relative);
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function clearTenantLogoAction(): Promise<void> {
  const tenantId = await requireTenantId();
  const pool = getPool();
  const { rows } = await pool.query<{ logo_path: string | null }>(`SELECT logo_path FROM tenants WHERE id = $1`, [
    tenantId,
  ]);
  const old = rows[0]?.logo_path;
  if (old) {
    await deleteStoredBlob(old);
  }
  await setTenantLogoPath(tenantId, null);
  revalidatePath("/app/settings");
}
