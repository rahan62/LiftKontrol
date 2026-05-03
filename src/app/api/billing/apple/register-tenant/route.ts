import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppleIapConfigFromEnv } from "@/lib/billing/apple-iap-config";
import { resolveUniqueTenantSlug, slugifyTenantName } from "@/lib/billing/tenant-slug";
import {
  verifyAppleSubscriptionTransaction,
  type VerifiedAppleSubscription,
} from "@/lib/billing/verify-apple-transaction";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

/** App Store ödemesi sonrası kiracı: Auth kullanıcı + `tenants` (+ üyelik) + `tenant_subscriptions`. Aynı e-posta/şifre web `/login` ve iOS Supabase oturumu ile uyumludur. Native `IapSubscribeSheet` burayı çağırır. */
export const runtime = "nodejs";

type Body = {
  transactionId?: string;
  companyName?: string;
  email?: string;
  password?: string;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false as const, error: msg }, { status });
}

function isDuplicateEmailAdminCreateUser(err: { message?: string; code?: string }): boolean {
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

export async function POST(request: Request) {
  const cfg = getAppleIapConfigFromEnv();
  if (!cfg) {
    return bad("Apple IAP sunucu yapılandırması eksik.", 503);
  }

  const service = createServiceRoleSupabaseClient();
  if (!service) {
    return bad("Supabase servis anahtarı yapılandırılmamış.", 503);
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("Geçersiz JSON gövdesi.");
  }

  const transactionId = String(body.transactionId ?? "").trim();
  const companyName = String(body.companyName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!transactionId || !companyName || !email || !password) {
    return bad("transactionId, companyName, email ve password gerekli.");
  }
  if (password.length < 8) {
    return bad("Şifre en az 8 karakter olmalı.");
  }

  let verified: VerifiedAppleSubscription;
  try {
    verified = await verifyAppleSubscriptionTransaction(cfg, transactionId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Apple doğrulaması başarısız.";
    return bad(msg, 422);
  }

  const { data: dup } = await service
    .from("tenant_subscriptions")
    .select("id")
    .eq("apple_original_transaction_id", verified.originalTransactionId)
    .maybeSingle();

  if (dup) {
    return NextResponse.json(
      {
        ok: false as const,
        code: "SUBSCRIPTION_ALREADY_USED" as const,
        error: "Bu App Store aboneliği zaten bir şirkete bağlı.",
      },
      { status: 409 },
    );
  }

  const startedAt = new Date(verified.purchaseDateMs).toISOString();
  const endsAt =
    verified.expiresDateMs != null ? new Date(verified.expiresDateMs).toISOString() : null;

  const subscriptionInsert = {
    plan_code: "apple_iap",
    status: "active",
    started_at: startedAt,
    ends_at: endsAt,
    billing_provider: "apple",
    apple_original_transaction_id: verified.originalTransactionId,
    apple_product_id: verified.productId,
    apple_environment: verified.environment,
    metadata: {
      apple_transaction_id: verified.transactionId,
      provisioned_via: "ios_register_tenant",
    },
  };

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
      return bad("Supabase anon yapılandırması eksik.", 503);
    }
    const anon = createClient(anonUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signData, error: signErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !signData.user?.id) {
      return NextResponse.json(
        {
          ok: false as const,
          code: "INVALID_PASSWORD" as const,
          error:
            "Bu e-posta zaten kayıtlı; şifre eşleşmiyor. Web’de kullandığınız şifreyi girin veya şifre sıfırlama kullanın.",
        },
        { status: 401 },
      );
    }
    userId = signData.user.id;
    createdNewAuthUser = false;
  } else {
    return bad(createErr?.message || "Kullanıcı oluşturulamadı.", 500);
  }

  let tenantId: string | null = null;
  let slug = "";
  /** Yeni firma satırı bu istekte oluşturulduysa hata halinde silinir */
  let createdTenantThisRequest = false;

  try {
    const existingTenantId = await fetchPrimaryTenantId(service, userId);

    if (existingTenantId) {
      tenantId = existingTenantId;
      const { data: trow } = await service.from("tenants").select("slug").eq("id", tenantId).single();
      slug = String(trow?.slug ?? "");

      const { error: se } = await service.from("tenant_subscriptions").insert({
        tenant_id: tenantId,
        ...subscriptionInsert,
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
        ...subscriptionInsert,
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
    const msg = e instanceof Error ? e.message : "Kayıt tamamlanamadı.";
    return bad(msg, 500);
  }

  return NextResponse.json({
    ok: true as const,
    tenantId,
    userId,
    slug,
  });
}
