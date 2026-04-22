import { DeleteFinanceEntryButton } from "@/components/forms/delete-button";
import { FinanceMarkPaidButton } from "@/components/finance/finance-mark-paid-button";
import { DataTableShell } from "@/components/module/data-table-shell";
import { formatMoneyAmount } from "@/lib/format/money";
import { listFinanceEntries } from "@/lib/data/finance";
import { entryTypeLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ createdFee?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const sp = await searchParams;
  const createdFeeId = sp.createdFee?.trim();

  let entries: Awaited<ReturnType<typeof listFinanceEntries>> = [];
  try {
    entries = await listFinanceEntries(ctx.tenantId);
  } catch {
    entries = [];
  }

  const showMaintenanceFeeBanner =
    Boolean(createdFeeId) && entries.some((e) => e.id === createdFeeId);

  return (
    <DataTableShell
      title={tr.finances.title}
      description={tr.finances.description}
      actions={
        <Link
          href="/app/finances/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.finances.newEntry}
        </Link>
      }
    >
      {showMaintenanceFeeBanner ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Sitedeki tüm asansör bakımları tamamlandı; anlaşılan bakım ücreti finans kaydı eklendi. Ödeme durumunu buradan
          güncelleyebilirsiniz.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.finances.date}</th>
              <th className="px-4 py-2">{tr.finances.scope}</th>
              <th className="px-4 py-2">{tr.finances.type}</th>
              <th className="px-4 py-2">{tr.finances.descriptionCol}</th>
              <th className="px-4 py-2 text-right">{tr.finances.amount}</th>
              <th className="px-4 py-2">{tr.finances.payment}</th>
              <th className="px-4 py-2 w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {entries.length ? (
              entries.map((e) => {
                const paid = e.payment_status === "paid";
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
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                      {e.occurred_on}
                    </td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{e.scope_label}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entryTypeLabel(e.entry_type)}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{e.label}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {formatMoneyAmount(e.amount, e.currency)}
                    </td>
                    <td className="px-4 py-2">
                      {paid ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {tr.common.paid}
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          {tr.common.unpaid}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <FinanceMarkPaidButton id={e.id} paid={paid} />
                        <DeleteFinanceEntryButton id={e.id} />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  {tr.finances.noEntries}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
