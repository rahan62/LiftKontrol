"use client";

import { useState } from "react";
import Link from "next/link";
import type { MarketingPricingContent } from "@/lib/data/marketing-pricing";
import { formatIyzicoMoney } from "@/lib/payments/parse-try-price";
import { IyzicoFormMount } from "./iyzico-form-mount";

type Props = {
  pricing: MarketingPricingContent;
  iyzicoReady: boolean;
  pricePreviewTry: number;
  includesVat: boolean;
};

export function OdemeClient({ pricing, iyzicoReady, pricePreviewTry, includesVat }: Props) {
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") || ""),
      surname: String(fd.get("surname") || ""),
      email: String(fd.get("email") || ""),
      gsmNumber: String(fd.get("gsmNumber") || ""),
      identityNumber: String(fd.get("identityNumber") || ""),
      registrationAddress: String(fd.get("registrationAddress") || ""),
      city: String(fd.get("city") || ""),
      zipCode: String(fd.get("zipCode") || ""),
    };

    try {
      const res = await fetch("/api/iyzico/checkout-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        status?: string;
        checkoutFormContent?: string;
        errorMessage?: string;
      };
      if (!res.ok || data.status !== "success" || !data.checkoutFormContent) {
        setError(data.errorMessage || "Ödeme formu açılamadı.");
        return;
      }
      setCheckoutHtml(data.checkoutFormContent);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  if (!iyzicoReady) {
    return (
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-6 text-amber-100">
        <p className="font-medium">Ödeme altyapısı henüz yapılandırılmadı.</p>
        <p className="mt-2 text-sm text-amber-200/80">
          Ortam değişkenleri: <code className="rounded bg-slate-900 px-1">IYZIPAY_URI</code>,{" "}
          <code className="rounded bg-slate-900 px-1">IYZIPAY_API_KEY</code>,{" "}
          <code className="rounded bg-slate-900 px-1">IYZIPAY_SECRET_KEY</code>
        </p>
        <Link href="/contact" className="mt-4 inline-block text-sm text-amber-300 underline hover:text-amber-200">
          İletişim
        </Link>
      </div>
    );
  }

  if (checkoutHtml) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Güvenli ödeme iyzico ile yapılır. Kart bilgileriniz bizim sunucularımıza iletilmez.
        </p>
        <IyzicoFormMount html={checkoutHtml} />
        <button
          type="button"
          onClick={() => setCheckoutHtml(null)}
          className="text-sm text-slate-500 underline hover:text-slate-300"
        >
          ← Bilgileri düzenle
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">{pricing.packageTitle}</p>
        <p className="mt-1 text-slate-500">{pricing.packageSubtitle}</p>
        <p className="mt-3 text-lg font-semibold text-amber-400">
          {formatIyzicoMoney(pricePreviewTry)} TRY
          {!includesVat ? (
            <span className="ml-2 text-xs font-normal text-slate-500">(KDV dahil tahmini)</span>
          ) : (
            <span className="ml-2 text-xs font-normal text-slate-500">(KDV dahil)</span>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">{pricing.priceNote}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">Ad *</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Soyad *</label>
          <input name="surname" required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400">E-posta *</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Cep telefonu *</label>
          <input
            name="gsmNumber"
            required
            placeholder="05xx xxx xx xx"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">T.C. kimlik no *</label>
          <input
            name="identityNumber"
            required
            inputMode="numeric"
            maxLength={11}
            pattern="\d{11}"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Deneme (sandbox) ortamında iyzico test verilerini kullanabilirsiniz.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400">Fatura adresi *</label>
          <textarea
            name="registrationAddress"
            required
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Şehir *</label>
          <input name="city" required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Posta kodu</label>
          <input name="zipCode" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        <Link href="/mesafeli-satis-sozlesmesi" className="text-amber-500/80 hover:text-amber-400">
          Mesafeli satış
        </Link>
        {" · "}
        <Link href="/teslimat-ve-iade" className="text-amber-500/80 hover:text-amber-400">
          Teslimat ve iade
        </Link>
        {" · "}
        <Link href="/gizlilik-sozlesmesi" className="text-amber-500/80 hover:text-amber-400">
          Gizlilik
        </Link>
      </p>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {busy ? "Hazırlanıyor…" : "Ödemeye geç"}
      </button>
    </form>
  );
}
