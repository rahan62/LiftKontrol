import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getMarketingPricing } from "@/lib/data/marketing-pricing";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Fiyatlandırma — Lift Kontrol",
  description:
    "Lift Kontrol: asansör bakım ve saha operasyonları için tek paket, şeffaf yıllık fiyat. İlk yıla özel kampanya.",
  alternates: { canonical: "/fiyatlar" },
};

export default async function FiyatlarPage() {
  const pricing = await getMarketingPricing();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[520px] w-[800px] rounded-full bg-amber-500/12 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[600px] rounded-full bg-sky-500/8 blur-[100px]" />
      </div>

      <MarketingHeader />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            {pricing.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {pricing.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
            {pricing.description}
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-lg">
          <div
            className="absolute -inset-px rounded-2xl bg-gradient-to-b from-amber-400/50 via-amber-500/20 to-transparent opacity-80 blur-sm"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="border-b border-slate-800 bg-slate-900/80 px-8 pb-6 pt-8 text-center">
              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                {pricing.campaignBadge}
              </span>
              <h2 className="mt-5 text-xl font-semibold text-white">{pricing.packageTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{pricing.packageSubtitle}</p>
              <div className="mt-8 flex flex-col items-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                    {pricing.priceMain}
                  </span>
                  <span className="text-xl font-semibold text-slate-400">{pricing.priceUnit}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{pricing.priceNote}</p>
              </div>
            </div>

            <ul className="space-y-3.5 px-8 py-8">
              {pricing.features.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-snug text-slate-300">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-800 bg-slate-950/50 px-8 py-6">
              <Link
                href="/odeme"
                className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Satın al
              </Link>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-md text-center text-xs leading-relaxed text-slate-600">
          {pricing.footerNote}{" "}
          <Link href="/contact" className="text-amber-500/90 underline-offset-2 hover:text-amber-400 hover:underline">
            İletişim
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
