import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUniqueTenantSlug, slugifyTenantName } from "@/lib/billing/tenant-slug";

export function isDuplicateEmailAdminCreateUser(err: { message?: string; code?: string }): boolean {
  const code = err.code;
  if (code === "email_exists") return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("already") || msg.includes("registered") || msg.includes("exists");
}

async function fetchPrimaryTenantId(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await service
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || data?.tenant_id == null) return null;
  return String(data.tenant_id);
}

export type SubscriptionInsertFields = Record<string, unknown>;

/**
 * Apple IAP veya iyzico sonrası: Auth kullanıcı + (gerekirse) kiracı + `tenant_subscriptions` satırı.
 */
export async function provisionSubscribedTenant(
  service: SupabaseClient,
  input: {
    email: string;
    password: string;
    companyName: string;
    subscriptionFields: SubscriptionInsertFields;
  },
): Promise<{
  tenantId: string;
  userId: string;
  slug: string;
  createdNewAuthUser: boolean;
}> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const companyName = input.companyName.trim();
  const subscriptionFields = input.subscriptionFields;

  let userId: string | null = null;
  let createdNewAuthUser = false;

  const { data: createdUser, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: companyName },
  });

  if (!createErr && createdUser.user?.id) {
    userId = createdUser.user.id;
    createdNewAuthUser = true;
  } else if (createErr && isDuplicateEmailAdminCreateUser(createErr)) {
    const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!anonUrl || !anonKey) {
      throw new Error("Supabase anon yapılandırması eksik.");
    }
    const anon = createClient(anonUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signData, error: signErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !signData.user?.id) {
      const err = new Error(
        "INVALID_PASSWORD: Bu e-posta zaten kayıtlı; şifre eşleşmiyor. Mevcut şifrenizi kullanın veya sıfırlayın.",
      );
      (err as Error & { code?: string }).code = "INVALID_PASSWORD";
      throw err;
    }
    userId = signData.user.id;
    createdNewAuthUser = false;
  } else {
    throw new Error(createErr?.message || "Kullanıcı oluşturulamadı.");
  }

  let tenantId: string | null = null;
  let slug = "";
  let createdTenantThisRequest = false;

  try {
    const existingTenantId = await fetchPrimaryTenantId(service, userId);

    if (existingTenantId) {
      tenantId = existingTenantId;
      const { data: trow } = await service.from("tenants").select("slug").eq("id", tenantId).single();
      slug = String(trow?.slug ?? "");

      const { error: se } = await service.from("tenant_subscriptions").insert({
        tenant_id: tenantId,
        ...subscriptionFields,
      });
      if (se) throw new Error(se.message);
    } else {
      const baseSlug = slugifyTenantName(companyName) || "tenant";
      slug = await resolveUniqueTenantSlug(service, baseSlug);

      const { data: tenant, error: te } = await service
        .from("tenants")
        .insert({
          name: companyName,
          slug,
          billing_email: email,
        })
        .select("id")
        .single();

      if (te || !tenant) {
        throw new Error(te?.message ?? "Firma kaydı başarısız.");
      }
      tenantId = tenant.id;
      createdTenantThisRequest = true;

      const { error: me } = await service.from("tenant_members").insert({
        tenant_id: tenantId,
        user_id: userId,
        system_role: "tenant_owner",
        is_active: true,
      });
      if (me) throw new Error(me.message);

      const { error: se } = await service.from("tenant_subscriptions").insert({
        tenant_id: tenantId,
        ...subscriptionFields,
      });
      if (se) throw new Error(se.message);
    }
  } catch (e) {
    if (createdTenantThisRequest && tenantId) {
      await service.from("tenants").delete().eq("id", tenantId);
    }
    if (createdNewAuthUser && userId) {
      await service.auth.admin.deleteUser(userId);
    }
    throw e;
  }

  return {
    tenantId: tenantId!,
    userId: userId!,
    slug,
    createdNewAuthUser,
  };
}
