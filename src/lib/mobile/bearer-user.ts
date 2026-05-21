import { isSupabaseConfigured } from "@/lib/auth/config";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type ResolvedAuthUser = {
  user: User;
  /** Present when Bearer auth was used (mobile); optional for cookie-only flows. */
  bearerToken?: string;
};

/**
 * Route handlers: kullanıcıyı Bearer veya tarayıcı Supabase oturumundan çöz.
 * Kiracı üyeliği gerekmez (ör. hesap silme, onboarding’siz kullanıcı).
 */
export async function resolveAuthUser(request: Request): Promise<
  { ok: true; auth: ResolvedAuthUser } | { ok: false; response: NextResponse }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Supabase yapılandırılmamış." }, { status: 501 }),
    };
  }

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user?.id) {
      return { ok: false, response: NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 }) };
    }
    return { ok: true, auth: { user, bearerToken: token } };
  }

  const serverSb = await createServerSupabase();
  if (!serverSb) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }) };
  }

  const {
    data: { user },
    error,
  } = await serverSb.auth.getUser();
  if (error || !user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }) };
  }
  return { ok: true, auth: { user } };
}
