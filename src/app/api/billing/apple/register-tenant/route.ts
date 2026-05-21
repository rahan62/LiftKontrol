import { NextResponse } from "next/server";
import { getAppleIapConfigFromEnv } from "@/lib/billing/apple-iap-config";
import { provisionSubscribedTenant } from "@/lib/billing/provision-subscribed-tenant";
import {
  verifyAppleSubscriptionTransaction,
  type VerifiedAppleSubscription,
} from "@/lib/billing/verify-apple-transaction";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { formatTrGsmE164 } from "@/lib/sms/phone-tr";

/** App Store ödemesi sonrası kiracı: Auth kullanıcı + `tenants` (+ üyelik) + `tenant_subscriptions`. Gövde: transactionId, companyName, email, password; `ownerPhone` (Türkiye GSM +90…) isteğe bağlı. Native `IapSubscribeSheet` burayı çağırır. */
export const runtime = "nodejs";

type Body = {
  transactionId?: string;
  companyName?: string;
  email?: string;
  password?: string;
  ownerPhone?: string;
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
  const ownerPhoneRaw = String(body.ownerPhone ?? "").trim();
  const ownerPhoneE164 = ownerPhoneRaw ? formatTrGsmE164(ownerPhoneRaw) : null;
  if (ownerPhoneRaw && !ownerPhoneE164) {
    return bad("Cep telefonu geçersiz (10 hane, 5 ile başlar) veya alanı boş bırakın.");
  }

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

  try {
    const { tenantId, userId, slug } = await provisionSubscribedTenant(service, {
      email,
      password,
      companyName,
      ownerPhoneE164: ownerPhoneE164 ?? undefined,
      subscriptionFields: {
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
      },
    });

    return NextResponse.json({
      ok: true as const,
      tenantId,
      userId,
      slug,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "INVALID_PASSWORD") {
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
    const msg = e instanceof Error ? e.message : "Kayıt tamamlanamadı.";
    return bad(msg, 500);
  }
}