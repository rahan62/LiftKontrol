import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/constants";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { getLocalAuthSecret } from "@/lib/auth/local-secret";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? "" };
  }

  const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getLocalAuthSecret());
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub) return null;
    return { id: sub, email };
  } catch {
    return null;
  }
}

