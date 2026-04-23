import Link from "next/link";

const LAST_UPDATED = "2026-03-28";

export function GizlilikSozlesmesiContent() {
  return (
    <div className="max-w-none space-y-8 text-slate-400">
      <p className="text-sm text-slate-500">Son güncelleme: {LAST_UPDATED}</p>

      <p className="leading-relaxed">
        İşbu <strong className="text-slate-200">Gizlilik Sözleşmesi</strong> (&quot;Sözleşme&quot;),{" "}
        <strong className="text-slate-200">Lift Kontrol</strong> markası altında sunulan web sitesi, web
        uygulaması ve mobil uygulama (&quot;Hizmet&quot;) kapsamında kişisel verilerin işlenmesine ilişkin
        esasları düzenler. Hizmet&apos;i kullanarak bu Sözleşme&apos;yi okuduğunuzu ve anladığınızı kabul
        etmiş sayılırsınız. Müşteri sözleşmeniz, ek protokoller veya veri işleme sözleşmeleri varsa, kişisel
        veri işleme açısından öncelikle onlar uygulanır.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Veri sorumlusu</h2>
        <p className="leading-relaxed">
          Kişisel verilerinizle ilgili talepler ve sorular için:{" "}
          <a href="mailto:support@liftkontrol.com" className="text-amber-400 hover:text-amber-300">
            support@liftkontrol.com
          </a>
          . Posta veya resmi başvuru adresi için{" "}
          <Link href="/contact" className="text-amber-400 hover:text-amber-300">
            İletişim
          </Link>{" "}
          sayfasını kullanabilirsiniz.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Kapsam</h2>
        <p className="leading-relaxed">
          Bu Sözleşme; Hizmet&apos;e kayıt olan şirket kullanıcıları, yetkili personel, saha
          kullanıcıları ve Hizmet&apos;i ziyaret edenler bakımından, Hizmet üzerinden işlenen kişisel
          verilere uygulanır. Şirketiniz adına işlenen müşteri veya üçüncü kişi verileri için ek olarak
          şirketinizin aydınlatma metinleri ve hukuki yükümlülükleri geçerli olabilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. İşlenen veri kategorileri</h2>
        <ul className="list-inside list-disc space-y-2 leading-relaxed">
          <li>
            <strong className="text-slate-300">Kimlik ve iletişim:</strong> ad, soyad, e-posta, telefon
            (varsa), şirket unvanı ve rol bilgisi.
          </li>
          <li>
            <strong className="text-slate-300">Hesap ve kullanım:</strong> oturum bilgileri, işlem
            kayıtları, IP adresi, cihaz ve tarayıcı türü, günlük (log) verileri, hata raporları.
          </li>
          <li>
            <strong className="text-slate-300">Operasyonel içerik:</strong> bakım, arıza, iş emri, saha
            kayıtları ve Hizmet içinde girilen operasyon verileri (bu verilerde üçüncü kişilere ait kişisel
            veriler bulunabilir; işleme sorumluluğu şirketinizle paylaşımlı veya şirketinize ait olabilir).
          </li>
          <li>
            <strong className="text-slate-300">Konum:</strong> yalnızca Hizmet içinde açıkça sağlanan
            özellikler kapsamında ve ilgili aydınlatma ile.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. İşleme amaçları</h2>
        <p className="leading-relaxed">
          Veriler; Hizmet&apos;in sunulması ve sözleşmenin ifası, kullanıcı doğrulama, güvenlik ve dolandırıcılığın
          önlenmesi, teknik destek, ürün iyileştirme, yasal yükümlülüklerin yerine getirilmesi ve meşru
          menfaat kapsamında işlenebilir. Pazarlama iletişimi yalnızca açık rızanız veya mevzuata uygun
          istisnalar dahilinde yapılır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Hukuki sebepler</h2>
        <p className="leading-relaxed">
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) ve ilgili mevzuat çerçevesinde;
          açık rıza, sözleşmenin kurulması veya ifası, veri sorumlusunun meşru menfaati veya hukuki
          yükümlülük gibi sebeplere dayanılabilir. Avrupa Ekonomik Alanı&apos;ndaki kullanıcılar için GDPR
          kapsamında benzer hukuki dayanaklar uygulanabilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Aktarım ve işleyenler</h2>
        <p className="leading-relaxed">
          Hizmet; barındırma, veritabanı, kimlik doğrulama ve analitik gibi amaçlarla güvenilir üçüncü taraf
          sağlayıcılar kullanabilir. Kişisel veriler, yeterli güvenlik önlemleri ve sözleşmesel taahhütler
          çerçevesinde yurt içinde veya KVKK / GDPR&apos;a uygun güvencelerle yurt dışına aktarılabilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Saklama süresi</h2>
        <p className="leading-relaxed">
          Veriler, işleme amacının gerektirdiği süre ve yasal zamanaşımı süreleri boyunca saklanır; süre
          sonunda silinir, yok edilir veya anonim hale getirilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Haklarınız</h2>
        <p className="leading-relaxed">
          KVKK md. 11 ve GDPR kapsamındaki haklar (erişim, düzeltme, silme, itiraz, veri taşınabilirliği vb.)
          için yukarıdaki iletişim kanallarından başvurabilirsiniz. Başvurularınız mevzuatta öngörülen süreler
          içinde yanıtlanır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. Çerezler ve benzeri teknolojiler</h2>
        <p className="leading-relaxed">
          Web uygulaması; oturum, güvenlik ve tercihler için çerez veya yerel depolama kullanabilir. Zorunlu
          çerezler Hizmet&apos;in çalışması için gereklidir; analitik veya pazarlama çerezleri varsa açık rıza
          veya ayarlarınız üzerinden yönetilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Güvenlik</h2>
        <p className="leading-relaxed">
          Yetkisiz erişim, kayıp veya ifşaya karşı uygun teknik ve idari tedbirler uygulanır. İnternet
          ortamında mutlak güvenlik garanti edilemez; güçlü şifre ve hesap güvenliği sizin sorumluluğunuzdadır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">11. Değişiklikler</h2>
        <p className="leading-relaxed">
          Bu Sözleşme güncellenebilir. Önemli değişikliklerde web sitesinde veya Hizmet içinde bildirim
          yapılabilir. Güncel metin her zaman bu sayfada yayımlanır.
        </p>
      </section>

      <p className="text-sm text-slate-500">
        <Link href="/support" className="text-amber-500/90 hover:text-amber-400">
          Destek
        </Link>
        {" · "}
        <Link href="/contact" className="text-amber-500/90 hover:text-amber-400">
          İletişim
        </Link>
        {" · "}
        <Link href="/hakkimda" className="text-amber-500/90 hover:text-amber-400">
          Hakkımızda
        </Link>
      </p>
    </div>
  );
}
