import { NextResponse } from "next/server";
import { iyzicoCheckoutFormRetrieve, isIyzicoConfigured } from "@/lib/payments/iyzico-server";

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
  if (!isIyzicoConfigured()) {
    return NextResponse.redirect(
      `${baseUrl()}/odeme/sonuc?ok=0&reason=${encodeURIComponent("Yapılandırma eksik.")}`,
    );
  }
  try {
    const r = await iyzicoCheckoutFormRetrieve(token);
    const paid =
      r.status === "success" &&
      (r.paymentStatus === "SUCCESS" || r.paymentStatus === "success");

    const params = new URLSearchParams();
    params.set("ok", paid ? "1" : "0");
    if (r.paymentId) {
      params.set("paymentId", r.paymentId);
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

    return NextResponse.redirect(`${baseUrl()}/odeme/sonuc?${params.toString()}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Doğrulama hatası";
    return NextResponse.redirect(`${baseUrl()}/odeme/sonuc?ok=0&reason=${encodeURIComponent(msg)}`);
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
