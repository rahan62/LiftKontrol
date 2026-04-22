import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { readStoredBlob, storedBlobBaseName } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  const { id } = await params;
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pool = getPool();
  const { rows } = await pool.query<{ form_file_path: string | null }>(
    `SELECT form_file_path FROM periodic_controls WHERE id = $1 AND tenant_id = $2`,
    [id, ctx.tenantId],
  );
  const rel = rows[0]?.form_file_path;
  if (!rel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let buf: Buffer;
  try {
    buf = await readStoredBlob(rel);
  } catch {
    return NextResponse.json({ error: "Missing file" }, { status: 404 });
  }
  const base = storedBlobBaseName(rel);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(base)}"`,
    },
  });
}
