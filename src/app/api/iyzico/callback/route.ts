import { NextResponse } from "next/server";
import { provisionSubscribedTenant } from "@/lib/billing/provision-subscribed-tenant";
import { unsealCheckoutPendingPayload } from "@/lib/payments/checkout-pending-crypto";
import { iyzicoCheckoutFormRetrieve, isIyzicoConfigured } from "@/lib/payments/iyzico-server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

function baseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return u.replace(/\/+$/, "");
}

async function extractToken(request: Request): Promise<string | null> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return new URLSearchParams(text).get("token");
  }
  try {
    const form = await request.formData();
    const t = form.get("token");
    return typeof t === "string" ? t : null;
  } catch {
    return null;
  }
}

async function redirectAfterRetrieve(token: string): Promise<NextResponse> {
  const root = baseUrl();

  if (!isIyzicoConfigured()) {
    return NextResponse.redirect(`${root}/odeme/sonuc?ok=0&reason=Yapılandırma eksik.`);
  }

  try {
    const r = await iyzicoCheckoutFormRetrieve(token);
    const paid =
      r.status === "success" && (r.paymentStatus === "SUCCESS" || r.paymentStatus === "success");

    const params = new URLSearchParams();
    params.set("ok", paid ? "1" : "0");
    if (r.paymentId) {
      params.set("paymentId", String(r.paymentId));
    }
    if (r.paidPrice) {
      params.set("paidPrice", r.paidPrice);
    }
    if (r.currency) {
      params.set("currency", r.currency);
    }
    if (!paid && (r.errorMessage || r.errorCode)) {
      params.set("reason", r.errorMessage || r.errorCode || "Ödeme tamamlanamadı.");
    }

    if (!paid) {
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    const paymentId = r.paymentId ? String(r.paymentId).trim() : "";
    if (!paymentId) {
      params.set("provisioned", "0");
      params.set(
        "provisionReason",
        "Ödeme kimliği alınamadı; hesap oluşturulamadı. Destek ile iletişime geçin.",
      );
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    const service = createServiceRoleSupabaseClient();
    if (!service) {
      params.set("provisioned", "0");
      params.set("provisionReason", "Sunucu yapılandırması eksik (Supabase servis anahtarı).");
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    const { data: existingSub } = await service
      .from("tenant_subscriptions")
      .select("id")
      .eq("iyzico_payment_id", paymentId)
      .maybeSingle();

    if (existingSub) {
      params.set("provisioned", "1");
      params.set("duplicate", "1");
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    const { data: pending } = await service
      .from("iyzico_checkout_pending")
      .select("ciphertext,nonce,expires_at")
      .eq("checkout_token", token)
      .maybeSingle();

    if (!pending?.ciphertext || !pending?.nonce) {
      params.set("provisioned", "0");
      params.set(
        "provisionReason",
        "Ödeme oturumu bulunamadı veya süresi doldu. Ödemeniz alınmış olabilir; destek ile iletişime geçin.",
      );
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    if (pending.expires_at && new Date(String(pending.expires_at)) < new Date()) {
      await service.from("iyzico_checkout_pending").delete().eq("checkout_token", token);
      params.set("provisioned", "0");
      params.set("provisionReason", "Ödeme oturumunun süresi doldu. Destek ile iletişime geçin.");
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    let payload;
    try {
      payload = unsealCheckoutPendingPayload(String(pending.ciphertext), String(pending.nonce));
    } catch {
      await service.from("iyzico_checkout_pending").delete().eq("checkout_token", token);
      params.set("provisioned", "0");
      params.set("provisionReason", "Ödeme oturumu okunamadı. Destek ile iletişime geçin.");
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    const endsAt = new Date();
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    try {
      await provisionSubscribedTenant(service, {
        email: payload.email,
        password: payload.password,
        companyName: payload.companyName,
        subscriptionFields: {
          plan_code: payload.product === "demo" ? "iyzico_demo" : "iyzico_yearly",
          status: "active",
          started_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          billing_provider: "iyzico",
          iyzico_payment_id: paymentId,
          metadata: {
            provisioned_via: "iyzico_checkout",
            paid_price: r.paidPrice ?? null,
            currency: r.currency ?? "TRY",
            checkout_token: token,
          },
        },
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const raw = e instanceof Error ? e.message : "Kayıt tamamlanamadı.";
      params.set("provisioned", "0");
      const reasonMsg =
        code === "INVALID_PASSWORD"
          ? "Bu e-posta zaten kayıtlı; seçtiğiniz şifre hesapla eşleşmiyor. Şifre sıfırlama veya doğru şifre ile yeniden ödeme oturumu açın."
          : raw;
      params.set("provisionReason", reasonMsg);
      return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
    }

    await service.from("iyzico_checkout_pending").delete().eq("checkout_token", token);

    params.set("provisioned", "1");
    params.set("loginEmail", payload.email.trim().toLowerCase());
    return NextResponse.redirect(`${root}/odeme/sonuc?${params.toString()}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Doğrulama hatası";
    return NextResponse.redirect(`${root}/odeme/sonuc?ok=0&reason=${encodeURIComponent(msg)}`);
  }
}

/**
 * iyzico ödeme formu tamamlandığında çağrılır (tarayıcı yönlendirmesi).
 */
export async function POST(request: Request) {
  const token = await extractToken(request);
  if (!token) {
    return NextResponse.redirect(
      `${baseUrl()}/odeme/sonuc?ok=0&reason=${encodeURIComponent("Ödeme jetonu yok.")}`,
    );
  }
  return redirectAfterRetrieve(token);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      `${baseUrl()}/odeme/sonuc?ok=0&reason=${encodeURIComponent("Jeton eksik.")}`,
    );
  }
  return redirectAfterRetrieve(token);
}
