import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { readStoredBlob, storedBlobBaseName } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  const { id } = await params;
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query<{ stored_file_path: string | null; title: string }>(
    `SELECT stored_file_path, title FROM contracts WHERE id = $1 AND tenant_id = $2`,
    [id, ctx.tenantId],
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
