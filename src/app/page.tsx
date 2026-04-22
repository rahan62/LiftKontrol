import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <MarketingHeader />
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
          Asansör bakım · arıza · montaj · revizyon — tek panel
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Asansör servis şirketiniz için modern operasyon yazılımı
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-400">
          Müşterilerinizi, sahalarınızı ve asansör varlıklarınızı tek yerden yönetin. Periyodik bakım,
          acil arıza, iş emirleri, saha ekipleri ve günlük sevk, stok ve finans, periyodik kontrol ile
          revizyon süreçleri — tümü Lift Kontrol ile uçtan uca kayıt altında.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-500">
          Teknisyenleriniz sahada iOS uygulamasıyla çalışır; ofis ekibiniz web panelinden anlık
          görünürlük sağlar. Verileriniz çok kiracılı, güvenli bulut altyapısında izole tutulur.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/fiyatlar"
            className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Fiyatları gör
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400 hover:text-white"
          >
            Giriş yap
          </Link>
          <Link
            href="/app"
            className="rounded-md border border-transparent px-5 py-2.5 text-sm font-medium text-amber-400/90 hover:text-amber-300"
          >
            Uygulamayı aç →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
