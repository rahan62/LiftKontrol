import type { Metadata } from "next";
import { GizlilikSozlesmesiContent } from "@/components/marketing/gizlilik-sozlesmesi-content";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Gizlilik sözleşmesi — Lift Kontrol",
  description:
    "Lift Kontrol gizlilik sözleşmesi: kişisel verilerin işlenmesi, KVKK hakları ve iletişim.",
  alternates: { canonical: "/gizlilik-sozlesmesi" },
  robots: { index: true, follow: true },
};

export default function GizlilikSozlesmesiPage() {
  return (
    <MarketingShell title="Gizlilik sözleşmesi">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Gizlilik sözleşmesi</h1>
        <div className="mt-10">
          <GizlilikSozlesmesiContent />
        </div>
      </main>
    </MarketingShell>
  );
}
