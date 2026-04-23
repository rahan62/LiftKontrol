import Image from "next/image";
import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-slate-800 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
        >
          <Image
            src="/brand/lift-kontrol-logo.png"
            alt=""
            width={1024}
            height={1024}
            priority
            className="h-9 w-auto shrink-0 object-contain sm:h-10"
          />
          <span className="text-sm font-semibold tracking-tight text-white group-hover:text-amber-400">
            Lift Kontrol
          </span>
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
          <Link href="/hakkimda" className="text-slate-400 hover:text-white">
            Hakkımızda
          </Link>
          <Link href="/gizlilik-sozlesmesi" className="text-slate-400 hover:text-white">
            Gizlilik sözleşmesi
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
