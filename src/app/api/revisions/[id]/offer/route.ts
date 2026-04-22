import { isSupabaseConfigured } from "@/lib/auth/config";
import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { readStoredBlob } from "@/lib/storage/blob-store";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Teklif PDF: web oturumu (çerez) veya mobil `Authorization: Bearer <access_token>` (revizyon oluşturma API’si ile aynı model).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let tenantId: string | null = null;

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;

  if (token && isSupabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (!userErr && user?.id) {
      const pool = getPool();
      const { rows: mem } = await pool.query<{ tenant_id: string }>(
        `SELECT tenant_id::text AS tenant_id
         FROM tenant_members
         WHERE user_id = $1::uuid AND is_active = true
         ORDER BY joined_at ASC
         LIMIT 1`,
        [user.id],
      );
      tenantId = mem[0]?.tenant_id ?? null;
    }
  }

  if (!tenantId) {
    const ctx = await getTenantContext();
    tenantId = ctx?.tenantId ?? null;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pool = getPool();
  const { rows } = await pool.query<{ offer_pdf_path: string | null }>(
    `SELECT offer_pdf_path FROM elevator_revisions WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  const rel = rows[0]?.offer_pdf_path;
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
      "Content-Disposition": `attachment; filename="revizyon-teklifi-${id.slice(0, 8)}.pdf"`,
    },
  });
}
