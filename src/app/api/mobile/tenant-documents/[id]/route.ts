import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { getPool } from "@/lib/db/pool";
import { deleteStoredBlob } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

/** Native: firma belgesi silme (satır + blob). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileTenantContext(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.ctx.tenantId;
  const pool = getPool();

  const { rows } = await pool.query<{ stored_path: string }>(
    `SELECT stored_path FROM tenant_documents WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [id, tenantId],
  );
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "Bulunamadı." }, { status: 404 });
  }

  await pool.query(`DELETE FROM tenant_documents WHERE id = $1::uuid AND tenant_id = $2::uuid`, [id, tenantId]);
  await deleteStoredBlob(row.stored_path);

  return NextResponse.json({ ok: true });
}
