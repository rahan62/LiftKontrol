import { defaultProfitLossRange, getProfitLossByCurrency } from "@/lib/data/accounting";
import { formatMoneyAmount } from "@/lib/format/money";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const sp = await searchParams;
  const def = defaultProfitLossRange();
  const from = (sp.from ?? "").trim() || def.from;
  const to = (sp.to ?? "").trim() || def.to;

  let rows: Awaited<ReturnType<typeof getProfitLossByCurrency>> = [];
  try {
    rows = await getProfitLossByCurrency(ctx.tenantId, from, to);
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr.accounting.profitLossHint}</p>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{tr.accounting.rangeFrom}</label>
          <input type="date" name="from" defaultValue={from} className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{tr.accounting.rangeTo}</label>
          <input type="date" name="to" defaultValue={to} className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900" />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.accounting.applyRange}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.accounting.currency}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.revenue}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.expenses}</th>
              <th className="px-4 py-2 text-right">{tr.accounting.net}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.currency} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-mono text-xs">{r.currency}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(r.revenue, r.currency)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(r.expenses, r.currency)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-semibold">{formatMoneyAmount(r.net, r.currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                  {tr.common.none}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
