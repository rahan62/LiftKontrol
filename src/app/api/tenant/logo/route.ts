import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { isS3StorageRef, readStoredBlob, s3KeyFromRef } from "@/lib/storage/blob-store";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pool = getPool();
  const { rows } = await pool.query<{ logo_path: string | null }>(`SELECT logo_path FROM tenants WHERE id = $1`, [
    ctx.tenantId,
  ]);
  const p = rows[0]?.logo_path;
  if (!p) {
    return NextResponse.json({ error: "No logo" }, { status: 404 });
  }
  let buf: Buffer;
  try {
    buf = await readStoredBlob(p);
  } catch {
    return NextResponse.json({ error: "Missing file" }, { status: 404 });
  }
  const nameRef = isS3StorageRef(p) ? s3KeyFromRef(p) : p;
  const lower = nameRef.toLowerCase();
  const type = lower.endsWith(".png") ? "image/png" : lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
  });
}
