import { NextResponse } from "next/server";
import { getMarketingPricing } from "@/lib/data/marketing-pricing";
import { type BuyerCheckoutInput, iyzicoCheckoutFormInitialize, isIyzicoConfigured } from "@/lib/payments/iyzico-server";

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    return xf.split(",")[0]?.trim() || "127.0.0.1";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function validateBuyer(body: Record<string, unknown>): { ok: true; buyer: BuyerCheckoutInput } | { ok: false; error: string } {
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
  if (!gsmNumber || gsmNumber.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Geçerli bir cep telefonu girin." };
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
  };
}

export async function POST(request: Request) {
  if (!isIyzicoConfigured()) {
    return NextResponse.json(
      { status: "failure", errorMessage: "Ödeme altyapısı yapılandırılmamış." },
      { status: 503 },
    );
  }

  let json: Record<string, unknown>;
  try {
    json = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: "failure", errorMessage: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const v = validateBuyer(json);
  if (!v.ok) {
    return NextResponse.json({ status: "failure", errorMessage: v.error }, { status: 400 });
  }

  try {
    const pricing = await getMarketingPricing();
    const result = await iyzicoCheckoutFormInitialize({
      pricing,
      buyer: v.buyer,
      clientIp: clientIp(request),
    });

    if (result.status !== "success" || !result.checkoutFormContent) {
      return NextResponse.json(
        {
          status: "failure",
          errorMessage: result.errorMessage || result.errorCode || "iyzico oturumu başlatılamadı.",
        },
        { status: 422 },
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
