"use server";

import { createClient } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export type ChangePasswordState = { ok: boolean; error?: string };

export async function changePasswordAction(_prev: ChangePasswordState | null, formData: FormData): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { ok: false, error: "Yeni şifre en az 8 karakter olmalıdır." };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "Şifreler eşleşmiyor." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, error: tr.auth.notConfigured };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
