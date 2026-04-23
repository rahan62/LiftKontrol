import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getMarketingPricing } from "@/lib/data/marketing-pricing";
import { computeLiftKontrolChargeTry, isIyzicoConfigured } from "@/lib/payments/iyzico-server";
import { PaymentTrustStrip } from "@/components/marketing/payment-trust-strip";
import { OdemeClient } from "./odeme-client";

export const metadata: Metadata = {
  title: "Satın al — Lift Kontrol",
  description: "Lift Kontrol yıllık lisans — güvenli ödeme (iyzico).",
  alternates: { canonical: "/odeme" },
  robots: { index: false, follow: true },
};

export default async function OdemePage() {
  const pricing = await getMarketingPricing();
  const { paid, includesVat } = computeLiftKontrolChargeTry(pricing);
  const iyzicoReady = isIyzicoConfigured();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[400px] w-[600px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <MarketingHeader />

      <main className="relative mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <Link href="/fiyatlar" className="text-sm text-amber-400 hover:text-amber-300">
          ← Fiyatlandırma
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Satın al</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tek ürün: yıllık lisans. Ödeme işlemi iyzico güvenli ödeme sayfasında tamamlanır.
        </p>

        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-6">
          <PaymentTrustStrip showSslNote={false} />
          <p className="mt-3 text-center text-xs text-slate-500">
            Bu sayfa ve ödeme bağlantıları güvenli bağlantı (HTTPS) üzerinden sunulur.
          </p>
          <p className="mt-4 text-center text-xs text-slate-500">
            Sipariş vererek{" "}
            <Link href="/mesafeli-satis-sozlesmesi" className="text-amber-500/90 hover:text-amber-400">
              Mesafeli satış sözleşmesi
            </Link>{" "}
            ve{" "}
            <Link href="/teslimat-ve-iade" className="text-amber-500/90 hover:text-amber-400">
              teslimat / iade şartları
            </Link>
            nı okuduğunuzu kabul etmiş olursunuz.
          </p>
        </div>

        <div className="mt-10">
          <OdemeClient
            pricing={pricing}
            iyzicoReady={iyzicoReady}
            pricePreviewTry={paid}
            includesVat={includesVat}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
