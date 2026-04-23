import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/tenants" className="font-semibold text-amber-400 hover:text-amber-300">
              Firmalar
            </Link>
            <Link href="/tenants/new" className="text-slate-400 hover:text-white">
              Yeni firma
            </Link>
            <Link href="/settings/marketing" className="text-slate-400 hover:text-white">
              Fiyatlandırma (site)
            </Link>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
