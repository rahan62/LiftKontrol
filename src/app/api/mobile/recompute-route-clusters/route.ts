import { recomputeTenantRouteClusters } from "@/lib/data/route-plans";
import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Native: asansör eklendiğinde / güncellendiğinde web `insertAsset` çalışmadığı için küme durumu boş kalabiliyor.
 * Bu uç, kiracı üyeliği doğrulandıktan sonra `tenant_route_cluster_state` satırını yeniden üretir.
 * `SUPABASE_SERVICE_ROLE_KEY` tanımlıysa RLS’siz yazar; yoksa kullanıcı JWT’si ile yazar.
 */
export async function POST(request: Request) {
  const auth = await getMobileTenantContext(request);
  if (!auth.ok) return auth.response;

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Authorization Bearer gerekli." }, { status: 401 });
  }

  const service = createServiceRoleSupabaseClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userSb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = service ?? userSb;

  try {
    await recomputeTenantRouteClusters(auth.ctx.tenantId, db);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Küme yenilenemedi";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
