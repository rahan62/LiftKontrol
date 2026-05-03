import Link from "next/link";
import { DeleteFinanceEntryButton } from "@/components/forms/delete-button";
import { FinanceMarkPaidButton } from "@/components/finance/finance-mark-paid-button";
import { listPendingReceivables } from "@/lib/data/accounting";
import { formatMoneyAmount } from "@/lib/format/money";
import { entryTypeLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ createdFee?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const sp = await searchParams;
  const createdFeeId = sp.createdFee?.trim();

  let rows: Awaited<ReturnType<typeof listPendingReceivables>> = [];
  try {
    rows = await listPendingReceivables(ctx.tenantId);
  } catch {
    rows = [];
  }

  const showBanner = Boolean(createdFeeId) && rows.some((e) => e.id === createdFeeId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr.accounting.receivablesHint}</p>

      {showBanner ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {tr.accounting.createdFeeBanner}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.finances.date}</th>
              <th className="px-4 py-2">{tr.accounting.customerCol}</th>
              <th className="px-4 py-2">{tr.finances.scope}</th>
              <th className="px-4 py-2">{tr.finances.type}</th>
              <th className="px-4 py-2">{tr.finances.descriptionCol}</th>
              <th className="px-4 py-2 text-right">{tr.finances.amount}</th>
              <th className="w-40 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((e) => {
                const isNew = createdFeeId === e.id;
                return (
                  <tr
                    key={e.id}
                    className={
                      isNew
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600 dark:text-slate-400">{e.occurred_on}</td>
                    <td className="px-4 py-2">
                      {e.customer_id ? (
                        <Link
                          href={`/app/accounting/current-accounts/${e.customer_id}`}
                          className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                        >
                          {e.customer_name ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{e.scope_label}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entryTypeLabel(e.entry_type)}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{e.label}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(e.amount, e.currency)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <FinanceMarkPaidButton id={e.id} paid={false} />
                        <DeleteFinanceEntryButton id={e.id} />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  {tr.accounting.noReceivables}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
