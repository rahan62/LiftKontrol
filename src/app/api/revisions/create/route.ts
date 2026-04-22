import { createElevatorRevisionForTenant, canCreateElevatorRevisionForRole } from "@/lib/data/create-elevator-revision-core";
import { getPool } from "@/lib/db/pool";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Body = {
  periodicControlId?: string;
  revisionArticleIds?: string[];
};

/**
 * Mobil uygulama: Supabase `Authorization: Bearer <access_token>` ile revizyon oluşturur.
 * Sunucu tarafında PDF ve blob depolama web ile aynıdır. Rol: teknisyen / portal kullanıcısı engellenir.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase yapılandırılmamış." }, { status: 501 });
  }

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Authorization Bearer gerekli." }, { status: 401 });
  }

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
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: "Oturum geçersiz." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON." }, { status: 400 });
  }

  const periodicControlId = String(body.periodicControlId ?? "").trim();
  const revisionArticleIds = Array.isArray(body.revisionArticleIds)
    ? body.revisionArticleIds.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const pool = getPool();
  const { rows: mem } = await pool.query<{ tenant_id: string; system_role: string }>(
    `SELECT tenant_id::text AS tenant_id, system_role
     FROM tenant_members
     WHERE user_id = $1::uuid AND is_active = true
     ORDER BY joined_at ASC
     LIMIT 1`,
    [user.id],
  );
  const membership = mem[0];
  if (!membership) {
    return NextResponse.json({ ok: false, error: "Kiracı üyeliği yok." }, { status: 403 });
  }

  if (!canCreateElevatorRevisionForRole(membership.system_role)) {
    return NextResponse.json(
      { ok: false, error: "Revizyon oluşturma yalnızca ofis / yönetici rollerine açıktır." },
      { status: 403 },
    );
  }

  const tenantId = membership.tenant_id;
  const { rows: pcCheck } = await pool.query<{ ok: boolean }>(
    `SELECT true AS ok FROM periodic_controls WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, periodicControlId],
  );
  if (!pcCheck[0]?.ok) {
    return NextResponse.json({ ok: false, error: "Periyodik kontrol bu şirkete ait değil veya yok." }, { status: 404 });
  }

  const result = await createElevatorRevisionForTenant(tenantId, {
    periodicControlId,
    revisionArticleIds,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, revisionId: result.revisionId });
}
