import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SELLER_LEGAL } from "@/lib/legal/seller-info";

export const metadata: Metadata = {
  title: "Mesafeli satış sözleşmesi — Lift Kontrol",
  description: "Lift Kontrol mesafeli satış ön bilgilendirme ve sözleşme metni özet çerçevesi.",
  alternates: { canonical: "/mesafeli-satis-sozlesmesi" },
  robots: { index: true, follow: true },
};

export default function MesafeliSatisPage() {
  return (
    <MarketingShell title="Mesafeli satış">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Mesafeli satış sözleşmesi</h1>
        <p className="mt-2 text-sm text-slate-500">Son güncelleme: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-slate-400">
          <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-amber-100/90">
            Bu sayfa, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde müşterilerinizi
            bilgilendirmek için örnek bir çerçeve sunar. Ticari ünvan, adres, MERSİS, vergi dairesi ve
            telefon bilgilerinizi <code className="text-amber-200/90">src/lib/legal/seller-info.ts</code>{" "}
            dosyasından güncelleyin; hukuki metni iş ortağınız veya avukatınızla kesinleştirmeniz önerilir.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Satıcı bilgileri</h2>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Ticari ünvan:</strong> {SELLER_LEGAL.tradeName}
              </li>
              <li>
                <strong className="text-slate-300">Adres:</strong> {SELLER_LEGAL.address}
              </li>
              <li>
                <strong className="text-slate-300">MERSİS:</strong> {SELLER_LEGAL.mersisNo}
              </li>
              <li>
                <strong className="text-slate-300">Telefon:</strong> {SELLER_LEGAL.phone}
              </li>
              <li>
                <strong className="text-slate-300">E-posta:</strong>{" "}
                <a href={`mailto:${SELLER_LEGAL.email}`} className="text-amber-400 hover:text-amber-300">
                  {SELLER_LEGAL.email}
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Alıcı</h2>
            <p>
              Ödeme sırasında beyan ettiğiniz kimlik, iletişim ve fatura bilgileri esas alınır. Bilgilerin
              doğruluğundan alıcı sorumludur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Sözleşme konusu ve bedel</h2>
            <p>
              Sözleşme konusu, Lift Kontrol yazılımına ilişkin süreli lisans / abonelik hizmetidir. Bedel,
              sipariş anında web sitede veya ödeme adımında gösterilen tutar ve para birimi üzerinden tahsil
              edilir; KDV ve vergi düzenlemeleri yürürlükteki mevzuata tabidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Ödeme</h2>
            <p>
              Ödemeler iyzico güvenli ödeme altyapısı ile tahsil edilir. Kart bilgileri satıcı sunucularında
              saklanmaz.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. İfa ve teslim</h2>
            <p>
              Hizmet dijital ortamda ifa edilir; fiziksel teslimat yoktur. Ödeme teyitinden sonra erişimin
              sağlanması ve hesap kurulumu için makul süre içinde tarafınıza dönüş yapılır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Cayma hakkı</h2>
            <p>
              Tüketici hakları 6502 sayılı Kanun ile düzenlenir. Dijital içerik / hizmette, tüketicinin onayı
              ile ifaya derhal başlanması ve bunun sözleşmede kabulü hallerinde cayma hakkının kullanılamayacağı
              yönündeki düzenlemeler saklıdır. İade ve cayma süreçleri için{" "}
              <Link href="/teslimat-ve-iade" className="text-amber-400 hover:text-amber-300">
                Teslimat ve iade şartları
              </Link>{" "}
              sayfasına bakınız.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Uyuşmazlık</h2>
            <p>
              Tüketici şikâyetleri için ilgilisinde tüketici hakem heyetleri ve tüketici mahkemeleri
              yetkilidir. Ön başvuru için satıcı ile iletişim:{" "}
              <a href={`mailto:${SELLER_LEGAL.email}`} className="text-amber-400 hover:text-amber-300">
                {SELLER_LEGAL.email}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Kişisel veriler</h2>
            <p>
              Kişisel verilerin işlenmesi{" "}
              <Link href="/gizlilik-sozlesmesi" className="text-amber-400 hover:text-amber-300">
                Gizlilik sözleşmesi
              </Link>{" "}
              kapsamındadır.
            </p>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
