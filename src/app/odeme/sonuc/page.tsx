import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Ödeme sonucu — Lift Kontrol",
  robots: { index: false, follow: false },
};

export default async function OdemeSonucPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    paymentId?: string;
    paidPrice?: string;
    currency?: string;
    reason?: string;
    provisioned?: string;
    provisionReason?: string;
    duplicate?: string;
    loginEmail?: string;
  }>;
}) {
  const sp = await searchParams;
  const ok = sp.ok === "1";
  const reason = sp.reason ?? null;
  const provisioned = sp.provisioned === "1";
  const provisionReason = sp.provisionReason ?? null;
  const duplicateCallback = sp.duplicate === "1";
  const loginEmail = sp.loginEmail?.trim() ?? "";

  const loginHref = loginEmail ? `/login?email=${encodeURIComponent(loginEmail)}` : "/login";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <MarketingHeader />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold text-white">{ok ? "Ödeme alındı" : "Ödeme tamamlanamadı"}</h1>

        {ok ? (
          <div className="mt-6 space-y-3 text-slate-300">
            <p>Teşekkürler. Ödemeniz iyzico üzerinden başarıyla sonuçlandı.</p>
            {sp.paymentId ? (
              <p className="text-sm text-slate-500">
                Ödeme referansı: <span className="font-mono text-slate-400">{sp.paymentId}</span>
              </p>
            ) : null}
            {sp.paidPrice ? (
              <p className="text-sm text-slate-500">
                Tutar: {sp.paidPrice} {sp.currency || "TRY"}
              </p>
            ) : null}

            {provisioned ? (
              <div className="rounded-lg border border-green-900/40 bg-green-950/25 px-4 py-3 text-sm text-green-100">
                <p className="font-medium text-white">Hesabınız hazır</p>
                <p className="mt-2 text-green-100/90">
                  Firma kaydınız ve yönetici erişiminiz oluşturuldu. Aşağıdan giriş yaparak panele
                  geçebilirsiniz; iOS uygulamasında da aynı e-posta ve şifreyi kullanın.
                </p>
                {duplicateCallback ? (
                  <p className="mt-2 text-xs text-green-200/70">
                    Bu ödeme daha önce işlenmişti; oturumunuza devam edebilirsiniz.
                  </p>
                ) : null}
                <Link
                  href={loginHref}
                  className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Giriş yap
                </Link>
              </div>
            ) : provisionReason ? (
              <div className="rounded-lg border border-amber-900/45 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
                <p className="font-medium text-amber-50">Ödeme tamam; hesap kurulumu bekliyor</p>
                <p className="mt-2 text-amber-100/85">{provisionReason}</p>
                <Link href="/contact" className="mt-3 inline-block text-amber-300 underline hover:text-amber-200">
                  İletişim
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Hesap kurulumu için{" "}
                <Link href="/contact" className="text-amber-400 hover:text-amber-300">
                  iletişim
                </Link>{" "}
                sayfasından bize ulaşabilirsiniz.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-slate-300">
            <p>İşlem başarısız veya iptal edildi.</p>
            {reason ? <p className="text-sm text-red-300/90">{reason}</p> : null}
            <Link
              href="/odeme"
              className="inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Tekrar dene
            </Link>
          </div>
        )}

        <p className="mt-10">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
            Ana sayfa
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
