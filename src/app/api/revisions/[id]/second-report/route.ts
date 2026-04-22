import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { readStoredBlob } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  const { id } = await params;
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pool = getPool();
  const { rows } = await pool.query<{ second_control_report_path: string | null }>(
    `SELECT second_control_report_path FROM elevator_revisions WHERE id = $1 AND tenant_id = $2`,
    [id, ctx.tenantId],
  );
  const rel = rows[0]?.second_control_report_path;
  if (!rel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let buf: Buffer;
  try {
    buf = await readStoredBlob(rel);
  } catch {
    return NextResponse.json({ error: "Missing file" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="revizyon-2-kontrol-${id.slice(0, 8)}.pdf"`,
    },
  });
}
