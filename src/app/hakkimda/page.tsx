import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Hakkında — Lift Kontrol",
  description:
    "Lift Kontrol: asansör bakım ve saha servisi şirketleri için operasyon yazılımı. Web ve iOS.",
  alternates: { canonical: "/hakkimda" },
};

export default function HakkimdaPage() {
  return (
    <MarketingShell title="Hakkında">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Hakkında</h1>
        <p className="mt-2 text-sm text-slate-500">Lift Kontrol</p>

        <div className="mt-10 space-y-6 text-slate-400">
          <p className="leading-relaxed">
            <strong className="text-slate-200">Lift Kontrol</strong>, asansör bakım, arıza müdahalesi ve saha
            servisi veren işletmelerin müşteri, saha, asansör varlıkları, bakım planları, iş emirleri ve ekip
            sevkını tek panelden yönetmesi için geliştirilmiş bir operasyon platformudur. Web üzerinden ofis
            süreçleri; iOS uygulaması ile sahadan erişim desteklenir.
          </p>
          <p className="leading-relaxed">
            Veriler çok kiracılı (multi-tenant) yapıda, şirket bazında ayrıştırılarak güvenli bulut
            altyapısında işlenir. Erişim rol bazlı yetkilendirme ile sınırlıdır; herkese açık self-servis kayıt
            bulunmaz — hesaplar şirket veya tedarikçi süreçleriyle tanımlanır.
          </p>
          <p className="leading-relaxed">
            Fiyatlandırma ve kurulum için{" "}
            <Link href="/fiyatlar" className="text-amber-400 hover:text-amber-300">
              Fiyatlar
            </Link>{" "}
            ve{" "}
            <Link href="/contact" className="text-amber-400 hover:text-amber-300">
              İletişim
            </Link>{" "}
            sayfalarımıza göz atabilirsiniz.
          </p>

          <h2 className="text-lg font-semibold text-white">İletişim</h2>
          <p>
            <a href="mailto:support@liftkontrol.com" className="text-amber-400 hover:text-amber-300">
              support@liftkontrol.com
            </a>
          </p>

          <p className="text-sm text-slate-500">
            <Link href="/gizlilik-sozlesmesi" className="text-amber-500/90 hover:text-amber-400">
              Gizlilik sözleşmesi
            </Link>
            {" · "}
            <Link href="/support" className="text-amber-500/90 hover:text-amber-400">
              Destek
            </Link>
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
