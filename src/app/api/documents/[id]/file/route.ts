import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { guessContentType, readStoredBlob, storedBlobBaseName } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  const { id } = await params;
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    stored_path: string;
    original_filename: string | null;
    mime_type: string | null;
  }>(
    `SELECT stored_path, original_filename, mime_type FROM tenant_documents WHERE id = $1 AND tenant_id = $2`,
    [id, ctx.tenantId],
  );
  const row = rows[0];
  if (!row?.stored_path) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readStoredBlob(row.stored_path);
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 404 });
  }

  const base = row.original_filename?.trim() || storedBlobBaseName(row.stored_path);
  const ct = row.mime_type?.trim() || guessContentType(base);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": ct,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(base)}"`,
    },
  });
}
