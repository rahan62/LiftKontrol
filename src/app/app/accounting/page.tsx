import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

export default function AccountingHubPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Link
        href="/app/accounting/current-accounts"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/40"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white">{tr.accounting.currentAccounts}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.accounting.currentAccountsHint}</p>
      </Link>
      <Link
        href="/app/accounting/profit-loss"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/40"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white">{tr.accounting.profitLoss}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.accounting.profitLossHint}</p>
      </Link>
      <Link
        href="/app/accounting/receivables"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/40"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white">{tr.accounting.receivables}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.accounting.receivablesHint}</p>
      </Link>
      <div className="sm:col-span-3">
        <Link
          href="/app/accounting/entries/new"
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.finances.newEntry}
        </Link>
      </div>
    </div>
  );
}
