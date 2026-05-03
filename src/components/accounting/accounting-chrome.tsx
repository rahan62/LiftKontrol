"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

const tabs = [
  { href: "/app/accounting/current-accounts", label: tr.accounting.currentAccounts },
  { href: "/app/accounting/profit-loss", label: tr.accounting.profitLoss },
  { href: "/app/accounting/receivables", label: tr.accounting.receivables },
] as const;

export function AccountingChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === "/app/accounting";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{tr.accounting.hubTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{tr.accounting.hubDescription}</p>
        </div>
        <Link
          href="/app/accounting/entries/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.finances.newEntry}
        </Link>
      </div>

      {!isHub ? (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <Link
            href="/app/accounting"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
            )}
          >
            {tr.accounting.overviewTab}
          </Link>
          {tabs.map((t) => {
            const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {children}
    </div>
  );
}
