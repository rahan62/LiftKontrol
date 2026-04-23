import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SELLER_LEGAL } from "@/lib/legal/seller-info";

export const metadata: Metadata = {
  title: "Teslimat ve iade şartları — Lift Kontrol",
  description: "Lift Kontrol dijital lisans teslimatı, cayma hakkı ve iade koşulları.",
  alternates: { canonical: "/teslimat-ve-iade" },
  robots: { index: true, follow: true },
};

export default function TeslimatVeIadePage() {
  return (
    <MarketingShell title="Teslimat ve iade">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Teslimat ve iade şartları</h1>
        <p className="mt-2 text-sm text-slate-500">Son güncelleme: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-slate-400">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Satıcı</h2>
            <p>
              İşbu şartlar kapsamında satıcı: <strong className="text-slate-200">{SELLER_LEGAL.tradeName}</strong>
              {", "}
              <a href={`mailto:${SELLER_LEGAL.email}`} className="text-amber-400 hover:text-amber-300">
                {SELLER_LEGAL.email}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Ürünün niteliği ve teslimat</h2>
            <p>
              Lift Kontrol, abonelik / lisans modeliyle sunulan bulut tabanlı bir yazılım hizmetidir. Fiziksel
              gönderim yapılmaz. Ödeme onayından sonra erişim ve hesap kurulumu, siparişte belirttiğiniz iletişim
              bilgileri üzerinden makul süre içinde sağlanır; süreçte size e-posta veya telefon ile bilgi
              verilebilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Cayma hakkı (ön bilgilendirme özeti)</h2>
            <p>
              6502 sayılı Kanun kapsamında tüketicilerin cayma hakkına ilişkin usul ve istisnalar, Mesafeli
              Satış Sözleşmesi ve ilgili mevzuatta düzenlenir. Dijital içerik veya hizmette, onayınızla derhal
              ifaya başlanması ve bunun sözleşmede açıkça kabulü hallerinde cayma hakkı sınırları mevzuata göre
              şekillenir. Ayrıntılar için{" "}
              <Link href="/mesafeli-satis-sozlesmesi" className="text-amber-400 hover:text-amber-300">
                Mesafeli satış sözleşmesi
              </Link>
              sayfamıza bakınız.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. İade ve ücret iadesi</h2>
            <p>
              Yasal cayma hakkınızın kullanılmasına veya sözleşmede öngörülen diğer iade koşullarına uygun
              taleplerde, iade süreci ödeme kuruluşu ve banka işlem sürelerine bağlı olarak işleme alınır.
              Teknik veya faturalama sorunlarında{" "}
              <a href={`mailto:${SELLER_LEGAL.email}`} className="text-amber-400 hover:text-amber-300">
                {SELLER_LEGAL.email}
              </a>{" "}
              adresinden bize ulaşabilirsiniz.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. İletişim</h2>
            <p>
              Sorularınız için:{" "}
              <Link href="/contact" className="text-amber-400 hover:text-amber-300">
                İletişim
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
