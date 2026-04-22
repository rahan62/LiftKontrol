import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Destek — Lift Kontrol",
  description: "Lift Kontrol uygulaması için destek ve iletişim bilgileri.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Lift Kontrol Destek",
    url: "/support",
  },
};

export default function SupportPage() {
  return (
    <MarketingShell title="Destek">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">Lift Kontrol · Support</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Destek</h1>
        <p className="mt-4 text-slate-400">
          Lift Kontrol mobil ve web uygulaması için yardım ve geri bildirim kanallarımız aşağıdadır. App Store ve
          dağıtım süreçlerinde bu sayfa resmi destek URL’si olarak kullanılabilir.
        </p>

        <section className="mt-10 space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bize ulaşın</h2>
          <ul className="space-y-3 text-slate-200">
            <li>
              <span className="text-slate-500">E-posta: </span>
              <a href="mailto:info@liftkontrol.com" className="text-amber-400 hover:text-amber-300">
                info@liftkontrol.com
              </a>
            </li>
            <li>
              <span className="text-slate-500">Telefon: </span>
              <a href="tel:+905332716358" className="text-amber-400 hover:text-amber-300">
                +90 533 271 63 58
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm text-slate-400">
          <h2 className="text-base font-semibold text-slate-200">Sıkça sorulanlar</h2>
          <p>
            <strong className="text-slate-300">Uygulamaya giriş:</strong> Erişim, şirketiniz veya tedarikçiniz
            tarafından verilen hesap ile yapılır; herkese açık kayıt bulunmaz.
          </p>
          <p>
            <strong className="text-slate-300">Hata veya öneri:</strong> Lütfen mümkünse ekran görüntüsü ve cihaz
            modeli ile birlikte{" "}
            <a href="mailto:info@liftkontrol.com" className="text-amber-500/90 hover:text-amber-400">
              info@liftkontrol.com
            </a>{" "}
            adresine yazın.
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/contact" className="text-amber-500/90 hover:text-amber-400">
            İletişim sayfası
          </Link>
          {" · "}
          <Link href="/privacy" className="text-amber-500/90 hover:text-amber-400">
            Gizlilik bildirimi
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}
