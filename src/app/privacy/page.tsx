import type { Metadata } from "next";
import Link from "next/link";
import { GizlilikSozlesmesiContent } from "@/components/marketing/gizlilik-sozlesmesi-content";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Gizlilik sözleşmesi — Lift Kontrol",
  description:
    "Lift Kontrol gizlilik sözleşmesi ve kişisel verilerin korunması (KVKK). App Store ve bağlantılar için /privacy.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

/** App Store / harici "Privacy Policy URL" için /privacy yolu korunur; içerik gizlilik sözleşmesi ile aynıdır. */
export default function PrivacyPage() {
  return (
    <MarketingShell title="Gizlilik">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Gizlilik sözleşmesi</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bu sayfa gizlilik sözleşmemizin tam metnidir. Türkçe kalıcı bağlantı:{" "}
          <Link href="/gizlilik-sozlesmesi" className="text-amber-500/90 hover:text-amber-400">
            /gizlilik-sozlesmesi
          </Link>
        </p>
        <div className="mt-10">
          <GizlilikSozlesmesiContent />
        </div>
      </main>
    </MarketingShell>
  );
}
