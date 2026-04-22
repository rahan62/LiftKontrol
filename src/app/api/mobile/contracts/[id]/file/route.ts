import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { getPool } from "@/lib/db/pool";
import { readStoredBlob, storedBlobBaseName } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

/** Native: sözleşme dosyası indirme (Bearer). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileTenantContext(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.ctx.tenantId;
  const pool = getPool();

  const { rows } = await pool.query<{ stored_file_path: string | null }>(
    `SELECT stored_file_path FROM contracts WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [id, tenantId],
  );
  const row = rows[0];
  if (!row?.stored_file_path) {
    return NextResponse.json({ error: "Dosya yok" }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readStoredBlob(row.stored_file_path);
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 404 });
  }

  const base = storedBlobBaseName(row.stored_file_path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(base)}"`,
    },
  });
}
