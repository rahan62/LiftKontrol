import { deleteUserAccount } from "@/lib/account/delete-user-account";
import { resolveAuthUser } from "@/lib/mobile/bearer-user";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Native + web: oturum + mevcut şifre ile hesabı ve (yalnız üyeyse) kiracı verisini kalıcı siler. */
export async function POST(request: Request) {
  const resolved = await resolveAuthUser(request);
  if (!resolved.ok) return resolved.response;

  const service = createServiceRoleSupabaseClient();
  if (!service) {
    return NextResponse.json({ ok: false, error: "Sunucu yapılandırması eksik." }, { status: 503 });
  }

  let body: { password?: string; confirmation?: string };
  try {
    body = (await request.json()) as { password?: string; confirmation?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const confirmation = String(body.confirmation ?? "");
  if (!password) {
    return NextResponse.json({ ok: false, error: "Şifre gerekli.", code: "PASSWORD_REQUIRED" }, { status: 400 });
  }

  const email = resolved.auth.user.email ?? "";
  const result = await deleteUserAccount({
    service,
    userId: resolved.auth.user.id,
    userEmail: email,
    password,
    confirmation,
  });

  if (!result.ok) {
    const status =
      result.code === "INVALID_PASSWORD"
        ? 401
        : result.code === "TENANT_OWNER_HAS_OTHERS"
          ? 409
          : result.code === "CONFIRMATION_MISMATCH"
            ? 400
            : 400;
    return NextResponse.json(
      { ok: false as const, error: result.message, code: result.code },
      { status },
    );
  }

  return NextResponse.json({ ok: true as const });
}
