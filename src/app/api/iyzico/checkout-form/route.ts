import { NextResponse } from "next/server";
import { getMarketingPricing } from "@/lib/data/marketing-pricing";
import {
  type BuyerCheckoutInput,
  iyzicoCheckoutFormInitialize,
  isIyzicoConfigured,
} from "@/lib/payments/iyzico-server";
import {
  isCheckoutPendingCryptoConfigured,
  sealCheckoutPendingPayload,
} from "@/lib/payments/checkout-pending-crypto";
import { formatTrGsmE164 } from "@/lib/sms/phone-tr";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    return xf.split(",")[0]?.trim() || "127.0.0.1";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function validateBuyer(
  body: Record<string, unknown>,
): { ok: true; buyer: BuyerCheckoutInput; ownerPhoneE164: string } | { ok: false; error: string } {
  const name = String(body.name || "").trim();
  const surname = String(body.surname || "").trim();
  const email = String(body.email || "").trim();
  const gsmNumber = String(body.gsmNumber || "").trim();
  let identityNumber = String(body.identityNumber || "").trim().replace(/\D/g, "");
  const registrationAddress = String(body.registrationAddress || "").trim();
  const city = String(body.city || "").trim();
  const zipCode = String(body.zipCode || "").trim();

  if (!name || !surname) {
    return { ok: false, error: "Ad ve soyad gerekli." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Geçerli bir e-posta girin." };
  }
  const ownerPhoneE164 = formatTrGsmE164(gsmNumber);
  if (!ownerPhoneE164) {
    return {
      ok: false,
      error: "Cep numarası Türkiye GSM formatında olmalıdır (10 hane, 5 ile başlar).",
    };
  }
  if (identityNumber.length !== 11) {
    return { ok: false, error: "T.C. kimlik numarası 11 hane olmalıdır." };
  }
  if (!registrationAddress || !city) {
    return { ok: false, error: "Adres ve şehir gerekli." };
  }

  if (process.env.IYZICO_ALLOW_SANDBOX_TC === "1" && identityNumber === "11111111111") {
    identityNumber = "74300864791";
  }

  return {
    ok: true,
    buyer: {
      name,
      surname,
      email,
      gsmNumber,
      identityNumber,
      registrationAddress,
      city,
      zipCode: zipCode || "34000",
      country: "Turkey",
    },
    ownerPhoneE164,
  };
}

export async function POST(request: Request) {
  if (!isIyzicoConfigured()) {
    return NextResponse.json(
      { status: "failure", errorMessage: "Ödeme altyapısı yapılandırılmamış." },
      { status: 503 },
    );
  }
  if (!isCheckoutPendingCryptoConfigured()) {
    return NextResponse.json(
      {
        status: "failure",
        errorMessage:
          "CHECKOUT_PENDING_SECRET eksik. Sunucuya en az 16 karakterlik bir gizli anahtar tanımlayın (iyzico oturumu için şifreli önbellek).",
      },
      { status: 503 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  if (!service) {
    return NextResponse.json(
      { status: "failure", errorMessage: "Supabase servis anahtarı yapılandırılmamış." },
      { status: 503 },
    );
  }

  let json: Record<string, unknown>;
  try {
    json = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: "failure", errorMessage: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const companyName = String(json.companyName || "").trim();
  const password = String(json.password || "");
  const passwordConfirm = String(json.passwordConfirm || "");

  const buyerPayload = { ...json };
  delete buyerPayload.companyName;
  delete buyerPayload.password;
  delete buyerPayload.passwordConfirm;

  const v = validateBuyer(buyerPayload);
  if (!v.ok) {
    return NextResponse.json({ status: "failure", errorMessage: v.error }, { status: 400 });
  }

  if (!companyName) {
    return NextResponse.json({ status: "failure", errorMessage: "Firma / şirket adı gerekli." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ status: "failure", errorMessage: "Şifre en az 8 karakter olmalıdır." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ status: "failure", errorMessage: "Şifreler eşleşmiyor." }, { status: 400 });
  }

  try {
    const pricing = await getMarketingPricing();
    const result = await iyzicoCheckoutFormInitialize({
      pricing,
      buyer: v.buyer,
      clientIp: clientIp(request),
    });

    if (result.status !== "success" || !result.checkoutFormContent || !result.token) {
      return NextResponse.json(
        {
          status: "failure",
          errorMessage: result.errorMessage || result.errorCode || "iyzico oturumu başlatılamadı.",
        },
        { status: 422 },
      );
    }

    let sealed;
    try {
      sealed = sealCheckoutPendingPayload({
        companyName,
        email: v.buyer.email.trim().toLowerCase(),
        password,
        ownerPhoneE164: v.ownerPhoneE164,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Oturum şifrelemesi başarısız.";
      return NextResponse.json({ status: "failure", errorMessage: msg }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error: insErr } = await service.from("iyzico_checkout_pending").insert({
      checkout_token: result.token,
      ciphertext: sealed.ciphertextB64,
      nonce: sealed.nonceB64,
      expires_at: expiresAt,
    });
    if (insErr) {
      return NextResponse.json(
        { status: "failure", errorMessage: insErr.message || "Ödeme oturumu kaydedilemedi." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "success",
      checkoutFormContent: result.checkoutFormContent,
      token: result.token,
      conversationId: result.conversationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return NextResponse.json({ status: "failure", errorMessage: msg }, { status: 500 });
  }
}
