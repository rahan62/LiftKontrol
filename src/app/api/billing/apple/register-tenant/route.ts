import { NextResponse } from "next/server";
import { getAppleIapConfigFromEnv } from "@/lib/billing/apple-iap-config";
import { resolveUniqueTenantSlug, slugifyTenantName } from "@/lib/billing/tenant-slug";
import { verifyAppleSubscriptionTransaction } from "@/lib/billing/verify-apple-transaction";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

/** App Store ödemesi sonrası yeni kiracı: Auth kullanıcı + `tenants` + `tenant_owner` üyeliği + `tenant_subscriptions`. Native `IapSubscribeSheet` burayı çağırır; web’de herkese açık form yoktur. */
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

  let verified;
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

  const { data: createdUser, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: companyName },
  });

  let userId: string | null = null;
  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const dupEmail =
      msg.includes("already") ||
      msg.includes("registered") ||
      createErr.message?.toLowerCase().includes("exists") ||
      (createErr as { code?: string }).code === "email_exists";
    if (dupEmail) {
      return NextResponse.json(
        {
          ok: false as const,
          code: "EMAIL_EXISTS" as const,
          error:
            "Bu e-posta zaten kayıtlı. Mevcut hesabınızla giriş yapın veya destek ile iletişime geçin.",
        },
        { status: 409 },
      );
    }
    return bad(createErr.message || "Kullanıcı oluşturulamadı.", 500);
  }

  userId = createdUser.user?.id ?? null;
  if (!userId) {
    return bad("Kullanıcı oluşturulamadı.", 500);
  }

  const baseSlug = slugifyTenantName(companyName) || "tenant";
  const slug = await resolveUniqueTenantSlug(service, baseSlug);

  const startedAt = new Date(verified.purchaseDateMs).toISOString();
  const endsAt =
    verified.expiresDateMs != null ? new Date(verified.expiresDateMs).toISOString() : null;

  let tenantId: string | null = null;
  try {
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

    const { error: me } = await service.from("tenant_members").insert({
      tenant_id: tenantId,
      user_id: userId,
      system_role: "tenant_owner",
      is_active: true,
    });
    if (me) throw new Error(me.message);

    const { error: se } = await service.from("tenant_subscriptions").insert({
      tenant_id: tenantId,
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
    });
    if (se) throw new Error(se.message);
  } catch (e) {
    if (tenantId) {
      await service.from("tenants").delete().eq("id", tenantId);
    }
    await service.auth.admin.deleteUser(userId);
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
