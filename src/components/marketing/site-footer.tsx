import Link from "next/link";
import { PaymentTrustStrip } from "@/components/marketing/payment-trust-strip";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/contact"
              className="inline-flex w-fit shrink-0 items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              İletişim
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link href="/fiyatlar" className="text-slate-300 hover:text-white">
                Fiyatlar
              </Link>
              <Link href="/support" className="text-slate-300 hover:text-white">
                Destek
              </Link>
              <Link href="/hakkimda" className="text-slate-300 hover:text-white">
                Hakkımızda
              </Link>
              <Link href="/teslimat-ve-iade" className="text-slate-300 hover:text-white">
                Teslimat ve iade
              </Link>
              <Link href="/mesafeli-satis-sozlesmesi" className="text-slate-300 hover:text-white">
                Mesafeli satış
              </Link>
              <Link href="/gizlilik-sozlesmesi" className="text-slate-300 hover:text-white">
                Gizlilik sözleşmesi
              </Link>
              <a href="mailto:support@liftkontrol.com" className="text-slate-300 hover:text-white">
                support@liftkontrol.com
              </a>
            </nav>
          </div>
          <p className="shrink-0 text-xs text-slate-500 sm:text-right">© {new Date().getFullYear()} Lift Kontrol</p>
        </div>

        <PaymentTrustStrip compact showSslNote className="border-t border-slate-800/80 pt-4" />
      </div>
    </footer>
  );
}
