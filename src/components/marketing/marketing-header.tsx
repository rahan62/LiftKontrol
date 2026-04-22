import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-slate-800 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white hover:text-amber-400">
          Lift Kontrol
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm sm:gap-x-4">
          <Link href="/fiyatlar" className="text-slate-400 hover:text-white">
            Fiyatlar
          </Link>
          <Link href="/contact" className="text-slate-400 hover:text-white">
            İletişim
          </Link>
          <Link href="/support" className="text-slate-400 hover:text-white">
            Destek
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-white px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-200"
          >
            Giriş
          </Link>
        </nav>
      </div>
    </header>
  );
}
