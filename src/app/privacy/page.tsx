import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Gizlilik — Lift Kontrol",
  description: "Lift Kontrol gizlilik bildirimi.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <MarketingShell title="Gizlilik">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Gizlilik bildirimi</h1>
        <p className="mt-2 text-sm text-slate-500">Son güncelleme: {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-10 max-w-none space-y-6 text-slate-400">
          <p>
            Bu bildirim, Lift Kontrol web sitesi ve Lift Kontrol mobil uygulaması (&quot;Hizmet&quot;) için kişisel
            verilerin işlenmesine ilişkin genel bilgi sağlar. Ayrıntılı sözleşmeler veya müşteri anlaşmalarınız
            geçerliyse onlar önceliklidir.
          </p>

          <h2 className="text-xl font-semibold text-white">Veri sorumlusu</h2>
          <p>
            Sorularınız için:{" "}
            <a href="mailto:support@liftkontrol.com" className="text-amber-400 hover:text-amber-300">
              support@liftkontrol.com
            </a>
            ,{" "}
            <a href="tel:+905332716358" className="text-amber-400 hover:text-amber-300">
              +90 533 271 63 58
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold text-white">Toplanan veriler</h2>
          <p className="leading-relaxed">
            Hizmet, iş operasyonları için hesap bilgileri (ör. e-posta, şirket bağlamı), saha ve bakım kayıtları,
            konum ve teknik günlükler (hata ayıklama) gibi verileri işleyebilir. Bu veriler çoğunlukla iş
            sözleşmeniz ve kullandığınız altyapı (ör. barındırma ve veritabanı sağlayıcısı) kapsamında işlenir.
          </p>

          <h2 className="text-xl font-semibold text-white">Amaç ve hukuki sebep</h2>
          <p>
            Veriler; sözleşmenin ifası, meşru menfaat (güvenlik ve iyileştirme) veya açık rıza kapsamında, uygulanabilir
            mevzuata uygun şekilde işlenir.
          </p>

          <h2 className="text-xl font-semibold text-white">Saklama</h2>
          <p>
            Veriler, Hizmet’in sağlanması ve yasal yükümlülükler için gerekli süre boyunca saklanır; ardından silinir
            veya anonimleştirilir.
          </p>

          <h2 className="text-xl font-semibold text-white">Haklarınız</h2>
          <p>
            KVKK ve GDPR kapsamındaki haklarınız için yukarıdaki iletişim kanallarından bize başvurabilirsiniz.
          </p>

          <p className="text-sm text-slate-500">
            <Link href="/support" className="text-amber-500/90 hover:text-amber-400">
              Destek
            </Link>
            {" · "}
            <Link href="/contact" className="text-amber-500/90 hover:text-amber-400">
              İletişim
            </Link>
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
