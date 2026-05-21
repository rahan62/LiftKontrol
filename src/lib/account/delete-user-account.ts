import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; code: DeleteAccountErrorCode; message: string };

export type DeleteAccountErrorCode =
  | "INVALID_PASSWORD"
  | "CONFIRMATION_MISMATCH"
  | "MISSING_EMAIL"
  | "TENANT_OWNER_HAS_OTHERS"
  | "TENANT_DELETE_FAILED"
  | "AUTH_DELETE_FAILED";

const CONFIRM_PHRASE = "LIFT_KONTROL_HESAP_SIL";

export function expectedAccountDeletionPhrase(): string {
  return CONFIRM_PHRASE;
}

/**
 * Şifre doğrular; kiracı sahibi ve başka aktif üye varsa reddeder.
 * Tek aktif üyenin olduğu kiracılar silinir (cascade ile iş verisi).
 * Ardından Supabase Auth kullanıcısı admin API ile silinir (profil + üyelik cascade).
 */
export async function deleteUserAccount(args: {
  service: SupabaseClient;
  userId: string;
  userEmail: string;
  password: string;
  confirmation: string;
}): Promise<DeleteAccountResult> {
  const { service, userId, userEmail, password, confirmation } = args;
  const email = userEmail.trim().toLowerCase();
  if (!email) {
    return { ok: false, code: "MISSING_EMAIL", message: "Hesapta e-posta yok; destek ile iletişime geçin." };
  }
  if (confirmation.trim() !== CONFIRM_PHRASE) {
    return {
      ok: false,
      code: "CONFIRMATION_MISMATCH",
      message: "Onay metni eşleşmiyor. Kutuya tam olarak şunu yazın: " + CONFIRM_PHRASE,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr) {
    return { ok: false, code: "INVALID_PASSWORD", message: "Şifre hatalı veya oturum doğrulanamadı." };
  }

  const { data: memberships, error: memErr } = await service
    .from("tenant_members")
    .select("tenant_id, system_role")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (memErr) {
    return {
      ok: false,
      code: "TENANT_DELETE_FAILED",
      message: memErr.message || "Üyelik okunamadı.",
    };
  }

  const rows = memberships ?? [];
  for (const row of rows) {
    const role = String(row.system_role ?? "").toLowerCase();
    if (role !== "tenant_owner") continue;
    const tenantId = String(row.tenant_id);
    const { count, error: cErr } = await service
      .from("tenant_members")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .neq("user_id", userId);
    if (cErr) {
      return { ok: false, code: "TENANT_DELETE_FAILED", message: cErr.message };
    }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        code: "TENANT_OWNER_HAS_OTHERS",
        message:
          "Kiracı sahibi olarak hesabınızı silemezsiniz: şirkette başka aktif üyeler var. Önce başka bir yöneticiye sahipliği devredin veya tüm üyeleri çıkarın; ardından tekrar deneyin.",
      };
    }
  }

  const tenantIds = [...new Set(rows.map((r) => String(r.tenant_id)))];
  const tenantsToRemove: string[] = [];
  for (const tid of tenantIds) {
    const { count, error: cErr } = await service
      .from("tenant_members")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tid)
      .eq("is_active", true);
    if (cErr) {
      return { ok: false, code: "TENANT_DELETE_FAILED", message: cErr.message };
    }
    if ((count ?? 0) === 1) tenantsToRemove.push(tid);
  }

  if (tenantsToRemove.length > 0) {
    const { error: delTenantErr } = await service.from("tenants").delete().in("id", tenantsToRemove);
    if (delTenantErr) {
      return {
        ok: false,
        code: "TENANT_DELETE_FAILED",
        message: delTenantErr.message || "Şirket verisi silinemedi.",
      };
    }
  }

  const { error: delAuthErr } = await service.auth.admin.deleteUser(userId);
  if (delAuthErr) {
    const msg = delAuthErr.message?.toLowerCase() ?? "";
    if (!msg.includes("not found")) {
      return {
        ok: false,
        code: "AUTH_DELETE_FAILED",
        message: delAuthErr.message || "Kullanıcı silinemedi.",
      };
    }
  }

  return { ok: true };
}
