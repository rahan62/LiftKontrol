"use server";

import { SignJWT } from "jose";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/constants";
import { getLocalAuthSecret } from "@/lib/auth/local-secret";
import { verifyLocalCredentials } from "@/lib/auth/verify-local-credentials";
import { tr } from "@/lib/i18n/tr";

export type LoginActionState = { error: string } | null;

function safeNextPath(raw: string): string {
  const t = (raw || "/app").trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return "/app";
  return t;
}

/** Prefer this over client fetch + Set-Cookie so Expo / embedded WebViews keep the session. */
export async function localLoginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/app"));
  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli" };
  }
  const user = await verifyLocalCredentials(email, password);
  if (!user) {
    return { error: tr.auth.signInFailed };
  }
  const remember =
    formData.get("remember") === "on" || formData.get("remember") === "1" || formData.get("remember") === "true";
  const maxAgeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const token = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(getLocalAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  });
  redirect(next);
}

export async function supabaseLoginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!isSupabaseConfigured()) {
    return { error: tr.auth.notConfigured };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/app"));
  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli" };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect(next);
}
