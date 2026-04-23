import { isSupabaseConfigured } from "@/lib/auth/config";
import { selectPrimaryTenantMembershipWithClient } from "@/lib/tenant/membership";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type MobileTenantContext = {
  userId: string;
  tenantId: string;
  systemRole: string;
};

/**
 * Mobil istemciler: `Authorization: Bearer <supabase_access_token>` → kullanıcı + ilk aktif kiracı üyeliği.
 * Üyelik çözümü yalnızca Supabase ile yapılır (`DATABASE_URL` gerekmez); böylece Vercel + Supabase-only deploy çalışır.
 */
export async function getMobileTenantContext(request: Request): Promise<
  { ok: true; ctx: MobileTenantContext } | { ok: false; response: NextResponse }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Supabase yapılandırılmamış." }, { status: 501 }),
    };
  }

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Authorization Bearer gerekli." }, { status: 401 }) };
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
    return { ok: false, response: NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 }) };
  }

  const membership = await selectPrimaryTenantMembershipWithClient(supabase, user.id);
  if (!membership?.tenantId) {
    return { ok: false, response: NextResponse.json({ error: "Kiracı üyeliği yok." }, { status: 403 }) };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      tenantId: membership.tenantId,
      systemRole: String(membership.role ?? ""),
    },
  };
}
