import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";

export function MarketingShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white hover:text-amber-400">
            Lift Kontrol
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            {title ? <span className="hidden text-slate-500 sm:inline">{title}</span> : null}
            <Link href="/contact" className="text-slate-400 hover:text-white">
              İletişim
            </Link>
            <Link href="/support" className="text-slate-400 hover:text-white">
              Destek
            </Link>
            <Link href="/login" className="rounded-md bg-white px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-200">
              Giriş
            </Link>
          </div>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
