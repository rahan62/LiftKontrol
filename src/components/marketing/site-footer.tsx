import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/contact"
            className="inline-flex w-fit items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            İletişim
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/support" className="text-slate-300 hover:text-white">
              Destek
            </Link>
            <Link href="/privacy" className="text-slate-300 hover:text-white">
              Gizlilik
            </Link>
            <a href="mailto:info@liftkontrol.com" className="text-slate-300 hover:text-white">
              info@liftkontrol.com
            </a>
            <a href="tel:+905332716358" className="text-slate-300 hover:text-white">
              +90 533 271 63 58
            </a>
          </nav>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Lift Kontrol</p>
      </div>
    </footer>
  );
}
