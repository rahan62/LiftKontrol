import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "İletişim — Lift Kontrol",
  description: "Lift Kontrol ile iletişim: e-posta ve telefon.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingShell title="İletişim">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">İletişim</h1>
        <p className="mt-4 text-slate-400">
          Lift Kontrol ürün ve hizmetleri hakkında sorularınız için bize ulaşabilirsiniz.
        </p>
        <ul className="mt-10 space-y-6 text-slate-200">
          <li>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">E-posta</div>
            <a href="mailto:support@liftkontrol.com" className="mt-1 inline-block text-lg text-amber-400 hover:text-amber-300">
              support@liftkontrol.com
            </a>
          </li>
          <li>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Telefon</div>
            <a href="tel:+905332716358" className="mt-1 inline-block text-lg text-amber-400 hover:text-amber-300">
              +90 533 271 63 58
            </a>
          </li>
        </ul>
        <p className="mt-10 text-sm text-slate-500">
          Teknik destek ve uygulama sorunları için{" "}
          <Link href="/support" className="text-amber-500/90 hover:text-amber-400">
            Destek
          </Link>{" "}
          sayfasına da göz atabilirsiniz.
        </p>
      </main>
    </MarketingShell>
  );
}
