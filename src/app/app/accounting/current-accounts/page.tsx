import Link from "next/link";
import { formatMoneyAmount } from "@/lib/format/money";
import { listCurrentAccounts } from "@/lib/data/accounting";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function CurrentAccountsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  let rows: Awaited<ReturnType<typeof listCurrentAccounts>> = [];
  try {
    rows = await listCurrentAccounts(ctx.tenantId);
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr.accounting.currentAccountsHint}</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.customers.name}</th>
              <th className="px-4 py-2">{tr.customers.code}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.sitesCol}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.assetsCol}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.outstandingCol}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{r.legal_name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{r.code ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.site_count}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.asset_count}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(r.outstanding, r.currency)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/app/accounting/current-accounts/${r.customer_id}`}
                      className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {tr.accounting.openLedger}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                  {tr.accounting.noCustomers}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
