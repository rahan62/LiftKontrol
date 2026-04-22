import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white hover:text-amber-400">
            Lift Kontrol
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
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
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
          One product per service company · Maintenance · Repair · Assembly
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Operations software built for elevator service companies.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-400">
          Manage customers, sites, long-lived elevator assets, recurring maintenance, emergency
          repairs, callbacks, installations, van and warehouse stock, quotations, and auditable field
          events — with Supabase and Next.js on Vercel.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Open app
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400 hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
